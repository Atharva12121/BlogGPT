"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Comment = {
  id: string;
  content: string;
  authorId: string;
  author: { id: string; name: string };
  createdAt: string;
};

export function BlogEngagement({
  blogId,
  blogSlug,
}: {
  blogId: string;
  blogSlug: string;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const [likesResponse, commentsResponse] = await Promise.all([
      fetch(`/api/blogs/${blogId}/likes`),
      fetch(`/api/blogs/${blogId}/comments`),
    ]);
    const [likes, commentList] = await Promise.all([
      likesResponse.json(),
      commentsResponse.json(),
    ]);
    if (likes.success) {
      setLiked(likes.data.liked);
      setLikeCount(likes.data.count);
    }
    if (commentList.success) setComments(commentList.data);
  };

  useEffect(() => {
    refresh().catch(() => toast.error("Unable to load likes and comments."));
  }, [blogId]);

  const toggleLike = async () => {
    if (user?.role !== "READER") return;
    setLoading(true);
    try {
      const response = await fetch(`/api/blogs/${blogId}/likes`, {
        method: liked ? "DELETE" : "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to update your like.");
        return;
      }
      setLiked(result.data.liked);
      setLikeCount(result.data.count);
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (user?.role !== "READER" || !content.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/blogs/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to post your comment.");
        return;
      }
      setComments((current) => [result.data, ...current]);
      setContent("");
      toast.success("Comment posted.");
    } catch {
      toast.error("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/blogs/${blogId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || "Unable to delete comment.");
        return;
      }
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      toast.success("Comment deleted.");
    } catch {
      toast.error("Unable to reach the server.");
    }
  };

  const isReader = user?.role === "READER";

  return (
    <section className="mx-auto mt-12 max-w-3xl border-t pt-8" aria-labelledby="engagement-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="engagement-title" className="font-serif text-2xl font-semibold">
          Join the conversation
        </h2>
        <Button
          type="button"
          variant={liked ? "accent" : "outline"}
          onClick={toggleLike}
          disabled={!isReader || loading}
          aria-pressed={liked}
          title={isReader ? undefined : "Sign in with a reader account to like this post"}
        >
          <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden />
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </Button>
      </div>

      {!isReader && (
        <p className="mt-3 text-sm text-muted-foreground">
          <Link className="text-accent underline" href={`/login?next=${encodeURIComponent(`/blog/${blogSlug}`)}`}>
            Sign in as a reader
          </Link>{" "}
          to like or comment.
        </p>
      )}

      {isReader && (
        <form onSubmit={submitComment} className="mt-5 space-y-3">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share a thoughtful comment…"
            aria-label="Write a comment"
            required
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            <Button type="submit" variant="accent" disabled={loading || !content.trim()}>
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
              Post comment
            </Button>
          </div>
        </form>
      )}

      <div className="mt-7 space-y-5">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{comment.author.name}</p>
                  <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                    {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </time>
                </div>
                {(user?.role === "ADMIN" ||
                  (user?.role === "READER" && user.id === comment.authorId)) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete comment"
                    onClick={() => deleteComment(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
