import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ReviewSchema = z.object({
  completed_id: z.string().uuid(),
  sponsor_handle: z.string().min(1).max(64),
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});

export const reviewSponsorCompletionFn = createServerFn({ method: "POST" })
  .inputValidator((input) => ReviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { error, data: res } = await supabaseAdmin.rpc("sponsor_review_completion", {
      _completed_id: data.completed_id,
      _sponsor_handle: data.sponsor_handle,
      _approve: data.approve,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return res as { status: "approved" | "rejected" };
  });
