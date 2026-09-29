import { PrismaClient, Role, BlogStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/utils/slug";
import { calculateReadingTime } from "../lib/utils/reading-time";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding demo accounts and content is disabled in production");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL before running the demo seed");
  }
  const databaseHost = new URL(databaseUrl).hostname;
  if (
    !["localhost", "127.0.0.1", "::1"].includes(databaseHost) &&
    process.env.ALLOW_REMOTE_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Demo seeding is restricted to local MongoDB. Set ALLOW_REMOTE_DEMO_SEED=true only if you intend to seed a remote database."
    );
  }

  const requestedAdminEmail = process.env.ADMIN_EMAIL?.trim();
  const requestedEmployeeEmail = process.env.EMPLOYEE_EMAIL?.trim();
  if (requestedAdminEmail && requestedAdminEmail === requestedEmployeeEmail) {
    throw new Error("ADMIN_EMAIL and EMPLOYEE_EMAIL must be different");
  }

  let admin = requestedAdminEmail
    ? await prisma.user.findUnique({ where: { email: requestedAdminEmail } })
    : await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (admin && admin.role !== Role.ADMIN) {
    throw new Error("ADMIN_EMAIL is already used by an account that is not an admin");
  }
  if (!admin) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!requestedAdminEmail || !adminPassword || adminPassword.length < 12) {
      throw new Error(
        "Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters, or create an admin account first"
      );
    }
    admin = await prisma.user.create({
      data: {
        name: "Platform Admin",
        email: requestedAdminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: Role.ADMIN,
      },
    });
  }

  let employee = requestedEmployeeEmail
    ? await prisma.user.findUnique({ where: { email: requestedEmployeeEmail } })
    : await prisma.user.findFirst({ where: { role: Role.EMPLOYEE } });
  if (employee && employee.role !== Role.EMPLOYEE) {
    throw new Error("EMPLOYEE_EMAIL is already used by an account that is not an employee");
  }
  if (!employee) {
    const employeePassword = process.env.EMPLOYEE_PASSWORD;
    if (!requestedEmployeeEmail || !employeePassword || employeePassword.length < 12) {
      throw new Error(
        "Set EMPLOYEE_EMAIL and an EMPLOYEE_PASSWORD of at least 12 characters, or create an employee account first"
      );
    }
    employee = await prisma.user.create({
      data: {
        name: "Demo Employee",
        email: requestedEmployeeEmail,
        passwordHash: await bcrypt.hash(employeePassword, 12),
        role: Role.EMPLOYEE,
      },
    });
  }
  const demoEmployee = employee;

  const readers = [];
  for (let index = 1; index <= 3; index += 1) {
    const email = `demo.reader${index}@example.test`;
    const existingReader = await prisma.user.findUnique({ where: { email } });
    if (existingReader && existingReader.role !== Role.READER) {
      throw new Error(`${email} is already used by a non-reader account`);
    }
    const reader = existingReader ?? await prisma.user.create({
      data: {
        name: `Demo Reader ${index}`,
        email,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role: Role.READER,
      },
    });
    readers.push(reader);
  }

  const categories = [
    { name: "Data & Analytics", slug: "data-analytics" },
    { name: "Careers & Tech", slug: "careers-tech" },
    { name: "Productivity", slug: "productivity" },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    catMap[c.slug] = cat.id;
  }

  const tagDefs = [
    "analytics",
    "business intelligence",
    "data trends",
    "full-stack development",
    "hiring",
    "software careers",
    "developer habits",
    "productivity",
    "coding tips",
  ];

  const tagMap: Record<string, string> = {};
  for (const name of tagDefs) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    tagMap[name] = tag.id;
  }

  const blog1Content = `<p>Data used to be something companies collected. Today, it's something companies think with.</p>
<p>The shift from reactive reporting to real-time, predictive analytics has changed how businesses make decisions. A decade ago, most companies looked at last month's numbers to plan next quarter. Now, dashboards update by the second, and AI models forecast outcomes before a trend even fully forms.</p>
<h2>1. From Descriptive to Predictive</h2>
<p>Traditional analytics answered "what happened?" Modern analytics answers "what's likely to happen next?" — and increasingly, "what should we do about it?" Predictive models are now embedded directly into everyday tools, not just specialist software.</p>
<h2>2. Democratization of Data</h2>
<p>You no longer need a data science degree to explore data. No-code dashboards and natural-language query tools mean a marketing manager can ask "which campaign drove the most signups last week?" and get an instant, visual answer.</p>
<h2>3. The Rise of Real-Time Decisioning</h2>
<p>Batch reports run overnight are being replaced by streaming analytics — useful for fraud detection, inventory management, and customer experience personalization, where a delay of even a few hours can mean lost revenue.</p>
<h2>4. Privacy-First Analytics</h2>
<p>With tightening data regulations globally, businesses are investing in privacy-preserving analytics — aggregated insights without exposing individual user data. This isn't just compliance; it's becoming a trust differentiator.</p>
<p><strong>Takeaway:</strong> Companies that treat analytics as a core decision-making layer — not just a reporting function — are the ones that will move faster and smarter in the years ahead.</p>`;

  const blog2Content = `<p>A good full-stack developer isn't someone who knows a little of everything — it's someone who knows enough of everything to build something that actually works, end to end.</p>
<h2>1. Startups Need Builders, Not Specialists (At First)</h2>
<p>Early-stage companies rarely have the luxury of ten specialized engineers. They need people who can design a database schema in the morning and fix a CSS bug in the afternoon. Full-stack developers fill that gap.</p>
<h2>2. The Modern Stack Has Gotten More Unified</h2>
<p>With frameworks like Next.js blurring the line between frontend and backend, and tools like Prisma simplifying database work, it's genuinely easier than it used to be for one person to own a feature from UI to API to database.</p>
<h2>3. Faster Iteration, Fewer Handoffs</h2>
<p>When one person understands the whole flow of a feature, there's less back-and-forth between teams. Bugs get fixed faster because there's no "that's not my part of the stack" excuse.</p>
<h2>4. What Companies Actually Look For</h2>
<p>Beyond just knowing React and Node, companies increasingly value full-stack developers who understand:</p>
<ul><li>Basic system design and API structuring</li><li>Authentication and security fundamentals</li><li>Deployment and debugging in production</li><li>Writing clean, readable, and testable code</li></ul>
<p><strong>Takeaway:</strong> Full-stack development isn't about being a jack-of-all-trades and master of none — it's about being able to take an idea from concept to a working, deployed product. That skill only becomes more valuable as teams stay lean and timelines get tighter.</p>`;

  const blog3Content = `<ol>
<li><strong>Read code more than you write it.</strong> Reviewing others' code — even messy code — teaches you patterns and anti-patterns faster than tutorials do.</li>
<li><strong>Write commit messages like someone else will read them.</strong> Because they will — including future you.</li>
<li><strong>Google the error message, not the whole problem.</strong> Specific errors lead to specific answers.</li>
<li><strong>Refactor in small steps.</strong> Big rewrites break things; small, tested changes don't.</li>
<li><strong>Take breaks before you're stuck for an hour.</strong> A 10-minute walk often solves what an hour of staring at the screen won't.</li>
</ol>
<p>None of these habits require extra time in your day — they just require a small shift in how you already work.</p>`;

  const blogs = [
    {
      title: "The Future of Data Analytics: What Every Business Should Know in 2026",
      slug: "the-future-of-data-analytics-what-every-business-should-know-in-2026",
      excerpt:
        "How predictive analytics, real-time decisioning, and privacy-first data practices are reshaping business strategy in 2026.",
      content: blog1Content,
      categoryId: catMap["data-analytics"],
      tags: ["analytics", "business intelligence", "data trends"],
    },
    {
      title: "Why Full-Stack Developers Are More Valuable Than Ever",
      slug: "why-full-stack-developers-are-more-valuable-than-ever",
      excerpt:
        "Lean teams, unified stacks, and end-to-end ownership make full-stack developers essential in modern software organizations.",
      content: blog2Content,
      categoryId: catMap["careers-tech"],
      tags: ["full-stack development", "hiring", "software careers"],
    },
    {
      title: "5 Small Habits That Make You a Better Developer",
      slug: "5-small-habits-that-make-you-a-better-developer",
      excerpt:
        "Five practical habits that improve code quality, debugging, and focus without adding hours to your day.",
      content: blog3Content,
      categoryId: catMap["productivity"],
      tags: ["developer habits", "productivity", "coding tips"],
    },
  ];

  const demoComments = [
    "This is a really useful perspective. Thanks for sharing!",
    "I am going to try this approach on my next project.",
    "Great explanation — especially the practical examples.",
  ];
  const demoBlogs = [];
  const now = new Date();

  for (const [blogIndex, b] of blogs.entries()) {
    const existing = await prisma.blog.findUnique({ where: { slug: b.slug } });
    if (existing && existing.authorId !== demoEmployee.id) {
      throw new Error(`Demo blog slug is already owned by another author: ${b.slug}`);
    }

    const publishedAt = new Date(now);
    publishedAt.setMonth(publishedAt.getMonth() - (10 - blogIndex * 4));
    const blog = existing ?? await prisma.blog.create({
      data: {
        title: b.title,
        slug: b.slug,
        content: b.content,
        excerpt: b.excerpt,
        status: BlogStatus.PUBLISHED,
        authorId: demoEmployee.id,
        categoryId: b.categoryId,
        readingTimeMinutes: calculateReadingTime(b.content),
        publishedAt,
        createdAt: publishedAt,
        views: [148, 96, 72][blogIndex],
      },
    });
    demoBlogs.push(blog);

    for (const tagName of b.tags) {
      const existingTag = await prisma.blogTag.findFirst({
        where: { blogId: blog.id, tagId: tagMap[tagName] },
      });
      if (!existingTag) {
        await prisma.blogTag.create({
          data: { blogId: blog.id, tagId: tagMap[tagName] },
        });
      }
    }

    for (const [readerIndex, reader] of readers.entries()) {
      await prisma.like.upsert({
        where: { blogId_userId: { blogId: blog.id, userId: reader.id } },
        update: {},
        create: {
          blogId: blog.id,
          userId: reader.id,
          createdAt: new Date(Math.min(
            publishedAt.getTime() + (readerIndex + 1) * 86400000,
            now.getTime()
          )),
        },
      });

      const content = demoComments[(blogIndex + readerIndex) % demoComments.length];
      const commentExists = await prisma.comment.findFirst({
        where: { blogId: blog.id, authorId: reader.id, content },
      });
      if (!commentExists) {
        const createdAt = new Date(publishedAt);
        createdAt.setDate(createdAt.getDate() + readerIndex + 2);
        await prisma.comment.create({
          data: { blogId: blog.id, authorId: reader.id, content, createdAt },
        });
      }
    }

    for (let viewIndex = 0; viewIndex < 12; viewIndex += 1) {
      const visitorId = `demo-seed:${blog.slug}:${viewIndex}`;
      const viewExists = await prisma.blogView.findFirst({
        where: { blogId: blog.id, visitorId },
      });
      if (!viewExists) {
        const viewedAt = new Date(now);
        viewedAt.setMonth(viewedAt.getMonth() - ((viewIndex + blogIndex * 3) % 12));
        viewedAt.setDate(Math.min(viewIndex + 1, 28));
        await prisma.blogView.create({
          data: { blogId: blog.id, visitorId, viewedAt },
        });
      }
    }
  }

  const paginationTopics = [
    "Building Accessible Interfaces That Work for Everyone",
    "A Practical Guide to Reliable API Design",
    "How to Plan a Sustainable Product Roadmap",
    "What Small Teams Should Know About Cloud Costs",
    "A Beginner-Friendly Introduction to Data Privacy",
    "Writing Better Documentation for Growing Teams",
    "Choosing the Right Database for Your Next Project",
    "Simple Ways to Improve Website Performance",
    "Creating Useful Dashboards Without Clutter",
    "Making Code Reviews More Constructive",
    "A Thoughtful Approach to Feature Flags",
    "How to Build a Healthy Remote Work Routine",
    "Designing Search That Helps Readers Find Answers",
    "Testing Strategies for Fast-Moving Products",
    "A Practical Checklist for Secure Account Setup",
  ];
  const paginationParagraphs = [
    "Strong products are built through small, deliberate decisions. Start by understanding the people who will use the feature, write down the problem in plain language, and agree on what a successful outcome should look like.",
    "Keep the first implementation focused. Clear ownership, accessible defaults, useful feedback, and a few meaningful measurements make it easier to learn from real use and improve without creating unnecessary complexity.",
    "A dependable workflow also leaves room for maintenance. Review what is working regularly, document important decisions, and make the next step obvious for the people who will support the product.",
  ];
  const paginationCategories = [
    "data-analytics",
    "careers-tech",
    "productivity",
  ];
  let paginationBlogCount = 0;

  for (const [index, topic] of paginationTopics.entries()) {
    const slug = `demo-pagination-article-${String(index + 1).padStart(2, "0")}`;
    const existing = await prisma.blog.findUnique({ where: { slug } });
    if (existing && existing.authorId !== demoEmployee.id) {
      throw new Error(`Demo blog slug is already owned by another author: ${slug}`);
    }

    const excerpt = `Sample article for exploring blog cards, search, pagination, and the employee blog list: ${topic.toLowerCase()}.`;
    const content = [
      `<p>${paginationParagraphs[index % paginationParagraphs.length]}</p>`,
      `<h2>${topic}</h2>`,
      ...paginationParagraphs
        .slice(0, 1 + (index % paginationParagraphs.length))
        .map((paragraph) => `<p>${paragraph}</p>`),
    ].join("\n");
    const publishedAt = new Date(now);
    publishedAt.setUTCMonth(publishedAt.getUTCMonth() - (index % 12));
    publishedAt.setUTCDate(1);
    publishedAt.setUTCHours(12, 0, 0, 0);
    const categoryId = catMap[paginationCategories[index % paginationCategories.length]];
    const blog = existing ?? await prisma.blog.create({
      data: {
        title: `Sample: ${topic}`,
        slug,
        content,
        excerpt,
        status: BlogStatus.PUBLISHED,
        authorId: demoEmployee.id,
        categoryId,
        readingTimeMinutes: calculateReadingTime(content),
        publishedAt,
        createdAt: publishedAt,
        views: 24 + index * 7,
      },
    });
    paginationBlogCount += 1;

    const topicTag = tagDefs[index % tagDefs.length];
    const secondaryTag = tagDefs[(index + 1) % tagDefs.length];
    for (const tagName of [topicTag, secondaryTag]) {
      const existingTag = await prisma.blogTag.findFirst({
        where: { blogId: blog.id, tagId: tagMap[tagName] },
      });
      if (!existingTag) {
        await prisma.blogTag.create({
          data: { blogId: blog.id, tagId: tagMap[tagName] },
        });
      }
    }

    for (const [readerIndex, reader] of readers.entries()) {
      await prisma.like.upsert({
        where: { blogId_userId: { blogId: blog.id, userId: reader.id } },
        update: {},
        create: {
          blogId: blog.id,
          userId: reader.id,
          createdAt: new Date(Math.min(
            publishedAt.getTime() + (readerIndex + 1) * 86400000,
            now.getTime()
          )),
        },
      });
      const comment = `Sample reader ${readerIndex + 1} found this article useful.`;
      const existingComment = await prisma.comment.findFirst({
        where: { blogId: blog.id, authorId: reader.id, content: comment },
      });
      if (!existingComment) {
        await prisma.comment.create({
          data: {
            blogId: blog.id,
            authorId: reader.id,
            content: comment,
            createdAt: new Date(Math.min(
              publishedAt.getTime() + (readerIndex + 2) * 86400000,
              now.getTime()
            )),
          },
        });
      }
    }

    for (let viewIndex = 0; viewIndex < 5; viewIndex += 1) {
      const visitorId = `demo-seed:${slug}:${viewIndex}`;
      const existingView = await prisma.blogView.findFirst({
        where: { blogId: blog.id, visitorId },
      });
      if (!existingView) {
        const viewedAt = new Date(publishedAt);
        viewedAt.setUTCDate(5 + viewIndex);
        if (viewedAt > now) viewedAt.setTime(now.getTime());
        await prisma.blogView.create({
          data: { blogId: blog.id, visitorId, viewedAt },
        });
      }
    }
  }

  console.log(`Demo seed complete: 3 featured blogs, ${paginationBlogCount} pagination samples, 3 demo readers, and reader engagement.`);
  console.log(`Admin: ${admin.email}`);
  console.log(`Employee: ${employee.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
