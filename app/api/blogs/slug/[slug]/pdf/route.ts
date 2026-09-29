import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };
type ContentBlock = { type: "heading" | "paragraph" | "list" | "quote" | "code"; text: string };

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  copy: "(c)",
  gt: ">",
  hellip: "...",
  lt: "<",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return namedEntities[code.toLowerCase()] ?? entity;
  });
}

function htmlToBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let currentType: ContentBlock["type"] = "paragraph";
  let currentText = "";
  let listNumber = 0;
  let orderedListDepth = 0;
  let listItemOpen = false;
  let skipTag: "script" | "style" | null = null;
  const tokens = html.match(/<[^>]*>|[^<]+/g) ?? [];

  const flush = () => {
    const text = currentText.replace(/[ \t]+/g, " ").trim();
    if (text) blocks.push({ type: currentType, text });
    currentText = "";
  };

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      if (!skipTag) currentText += decodeEntities(token).replace(/\s+/g, " ");
      continue;
    }
    const match = token.match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
    if (!match) continue;
    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (tag === "script" || tag === "style") {
      if (!closing) skipTag = tag;
      else if (skipTag === tag) skipTag = null;
      continue;
    }
    if (skipTag) continue;
    if (tag === "ol") {
      orderedListDepth += closing ? -1 : 1;
      if (!closing) listNumber = 0;
      continue;
    }
    if (tag === "ul") continue;
    if (listItemOpen && (tag === "p" || tag === "div")) continue;

    if (tag === "img" && !closing) {
      const alt = token.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
      if (alt) currentText += `[Image: ${decodeEntities(alt)}] `;
      continue;
    }
    if (tag === "br") {
      flush();
      continue;
    }
    if (!["p", "div", "section", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre"].includes(tag)) {
      continue;
    }

    if (closing) {
      flush();
      if (tag === "li") listItemOpen = false;
      continue;
    }

    flush();
    if (tag === "li") {
      listNumber += 1;
      currentType = "list";
      currentText = orderedListDepth > 0 ? `${listNumber}. ` : "- ";
      listItemOpen = true;
    } else if (tag.startsWith("h")) {
      currentType = "heading";
    } else if (tag === "blockquote") {
      currentType = "quote";
    } else if (tag === "pre") {
      currentType = "code";
    } else {
      currentType = "paragraph";
    }
  }
  flush();
  return blocks;
}

function pdfText(text: string) {
  return text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-").replace(/…/g, "...");
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } },
  });
  if (!blog || blog.status !== "PUBLISHED") {
    return Response.json({ success: false, message: "Blog not found" }, { status: 404 });
  }

  const document = new PDFDocument({
    size: "A4",
    margin: 56,
    bufferPages: true,
    info: {
      Title: blog.title,
      Author: blog.author.name,
      Subject: "BlogGPT blog article",
    },
  });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const contentWidth = document.page.width - document.page.margins.left - document.page.margins.right;
  document.fillColor("#0f766e").font("Helvetica-Bold").fontSize(9).text("BLOGGPT  /  BLOG ARTICLE");
  document.moveDown(1.1);
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(25).text(pdfText(blog.title), {
    width: contentWidth,
    lineGap: 4,
  });
  document.moveDown(0.6);
  document.fillColor("#475569").font("Helvetica").fontSize(10).text(
    `By ${pdfText(blog.author.name)}  |  ${blog.readingTimeMinutes} min read  |  Published ${new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(blog.publishedAt ?? blog.createdAt)}`
  );
  document.moveDown(0.8);
  document.strokeColor("#cbd5e1").lineWidth(1)
    .moveTo(document.page.margins.left, document.y)
    .lineTo(document.page.width - document.page.margins.right, document.y)
    .stroke();
  document.moveDown(1.2);

  for (const block of htmlToBlocks(blog.content)) {
    const text = pdfText(block.text);
    const styles = {
      heading: { font: "Helvetica-Bold", size: 16, color: "#0f172a", gap: 8, lineGap: 3 },
      paragraph: { font: "Helvetica", size: 11, color: "#1f2937", gap: 9, lineGap: 4 },
      list: { font: "Helvetica", size: 11, color: "#1f2937", gap: 5, lineGap: 3 },
      quote: { font: "Helvetica-Oblique", size: 11, color: "#475569", gap: 9, lineGap: 4 },
      code: { font: "Courier", size: 9, color: "#1e293b", gap: 9, lineGap: 3 },
    } as const;
    const style = styles[block.type];
    document.font(style.font).fontSize(style.size).fillColor(style.color);
    const indent = block.type === "list" || block.type === "quote" ? 16 : 0;
    const width = contentWidth - indent;
    const height = document.heightOfString(text, { width, lineGap: style.lineGap });
    if (document.y + height + style.gap > document.page.height - document.page.margins.bottom) {
      document.addPage();
    }
    if (block.type === "quote") {
      const y = document.y;
      document.strokeColor("#14b8a6").lineWidth(2)
        .moveTo(document.page.margins.left, y)
        .lineTo(document.page.margins.left, y + Math.max(height, 12))
        .stroke();
    }
    document.text(text, { width, indent, lineGap: style.lineGap });
    document.moveDown(style.gap / 12);
  }

  const pages = document.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index += 1) {
    document.switchToPage(index);
    const footerY = document.page.height - document.page.margins.bottom + 24;
    document.fillColor("#64748b").font("Helvetica").fontSize(8)
      .text("BlogGPT  |  For reading and reference", document.page.margins.left, footerY, {
        width: contentWidth / 2,
        lineBreak: false,
      })
      .text(`Page ${index - pages.start + 1} of ${pages.count}`, document.page.margins.left + contentWidth / 2, footerY, {
        width: contentWidth / 2,
        align: "right",
        lineBreak: false,
      });
  }
  document.end();

  const pdf = await finished;
  const filename = `${blog.slug.replace(/[^a-z0-9-]/gi, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(pdf.length),
    },
  });
}
