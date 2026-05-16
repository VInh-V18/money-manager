import api from "@/lib/axios";
import type { Feedback, PaginatedResult } from "@/types";

export const feedbackService = {
  list: (page = 1, limit = 20) =>
    api
      .get("/feedback", { params: { page, limit } })
      .then((r) => r.data.data as PaginatedResult<Feedback>),

  create: (data: Pick<Feedback, "type" | "title" | "message">) =>
    api.post("/feedback", data).then((r) => r.data.data.feedback as Feedback),
};
