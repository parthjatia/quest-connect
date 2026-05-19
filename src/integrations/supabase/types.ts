export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendee_meets: {
        Row: {
          attendee_id: string
          created_at: string
          id: string
          met_attendee_id: string
        }
        Insert: {
          attendee_id: string
          created_at?: string
          id?: string
          met_attendee_id: string
        }
        Update: {
          attendee_id?: string
          created_at?: string
          id?: string
          met_attendee_id?: string
        }
        Relationships: []
      }
      attendees: {
        Row: {
          academic_background: string | null
          age: number | null
          ai_experience: Database["public"]["Enums"]["ai_experience"] | null
          country: string | null
          created_at: string
          current_zone: string | null
          discovery_visibility: boolean
          event_goal: Database["public"]["Enums"]["event_goal"] | null
          full_name: string | null
          goals: string[] | null
          group_id: string | null
          icebreakers: string | null
          id: string
          interests: string[] | null
          late: boolean
          looking_for: string | null
          meet_bonus_points: number
          met_attendee_ids: string[] | null
          onboarded: boolean
          personality_tags: string[] | null
          pod_bonus_points: number
          points: number
          quest_activity_score: number
          skills: string[] | null
          sponsor_open: boolean
          track: string | null
          track_intent: Database["public"]["Enums"]["track_intent"] | null
          university: string | null
          updated_at: string
          user_id: string | null
          verify_code: string
          wrapped_image_url: string | null
          wrapped_story: string | null
        }
        Insert: {
          academic_background?: string | null
          age?: number | null
          ai_experience?: Database["public"]["Enums"]["ai_experience"] | null
          country?: string | null
          created_at?: string
          current_zone?: string | null
          discovery_visibility?: boolean
          event_goal?: Database["public"]["Enums"]["event_goal"] | null
          full_name?: string | null
          goals?: string[] | null
          group_id?: string | null
          icebreakers?: string | null
          id?: string
          interests?: string[] | null
          late?: boolean
          looking_for?: string | null
          meet_bonus_points?: number
          met_attendee_ids?: string[] | null
          onboarded?: boolean
          personality_tags?: string[] | null
          pod_bonus_points?: number
          points?: number
          quest_activity_score?: number
          skills?: string[] | null
          sponsor_open?: boolean
          track?: string | null
          track_intent?: Database["public"]["Enums"]["track_intent"] | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          verify_code?: string
          wrapped_image_url?: string | null
          wrapped_story?: string | null
        }
        Update: {
          academic_background?: string | null
          age?: number | null
          ai_experience?: Database["public"]["Enums"]["ai_experience"] | null
          country?: string | null
          created_at?: string
          current_zone?: string | null
          discovery_visibility?: boolean
          event_goal?: Database["public"]["Enums"]["event_goal"] | null
          full_name?: string | null
          goals?: string[] | null
          group_id?: string | null
          icebreakers?: string | null
          id?: string
          interests?: string[] | null
          late?: boolean
          looking_for?: string | null
          meet_bonus_points?: number
          met_attendee_ids?: string[] | null
          onboarded?: boolean
          personality_tags?: string[] | null
          pod_bonus_points?: number
          points?: number
          quest_activity_score?: number
          skills?: string[] | null
          sponsor_open?: boolean
          track?: string | null
          track_intent?: Database["public"]["Enums"]["track_intent"] | null
          university?: string | null
          updated_at?: string
          user_id?: string | null
          verify_code?: string
          wrapped_image_url?: string | null
          wrapped_story?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_quests: {
        Row: {
          ai_feedback: string | null
          attendee_id: string
          claimed_at: string
          id: string
          quest_id: string
          quest_photo_url: string | null
        }
        Insert: {
          ai_feedback?: string | null
          attendee_id: string
          claimed_at?: string
          id?: string
          quest_id: string
          quest_photo_url?: string | null
        }
        Update: {
          ai_feedback?: string | null
          attendee_id?: string
          claimed_at?: string
          id?: string
          quest_id?: string
          quest_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completed_quests_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      event_settings: {
        Row: {
          id: boolean
          registration_open: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          registration_open?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          registration_open?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      group_quest_submissions: {
        Row: {
          created_at: string
          group_id: string
          id: string
          photo_url: string
          quest_id: string
          reviewed_at: string | null
          reviewer_note: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          photo_url: string
          quest_id: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          photo_url?: string
          quest_id?: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          group_name: string
          id: string
          pod_rationale: string | null
        }
        Insert: {
          created_at?: string
          group_name?: string
          id?: string
          pod_rationale?: string | null
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          pod_rationale?: string | null
        }
        Relationships: []
      }
      pod_verifications: {
        Row: {
          created_at: string
          group_id: string
          id: string
          verified_id: string
          verifier_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          verified_id: string
          verifier_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          verified_id?: string
          verifier_id?: string
        }
        Relationships: []
      }
      quest_transcripts: {
        Row: {
          attendee_id: string
          id: string
          quest_id: string
          transcript_url: string
          uploaded_at: string
        }
        Insert: {
          attendee_id: string
          id?: string
          quest_id: string
          transcript_url: string
          uploaded_at?: string
        }
        Update: {
          attendee_id?: string
          id?: string
          quest_id?: string
          transcript_url?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          approval_status: string
          created_at: string
          created_by_sponsor: string | null
          description: string
          emoji: string | null
          end_at: string | null
          id: string
          is_live: boolean
          is_pod_gate: boolean
          points_awarded: number
          start_at: string | null
          title: string
          transcript_url: string | null
          type: Database["public"]["Enums"]["quest_type"]
        }
        Insert: {
          approval_status?: string
          created_at?: string
          created_by_sponsor?: string | null
          description: string
          emoji?: string | null
          end_at?: string | null
          id?: string
          is_live?: boolean
          is_pod_gate?: boolean
          points_awarded?: number
          start_at?: string | null
          title: string
          transcript_url?: string | null
          type?: Database["public"]["Enums"]["quest_type"]
        }
        Update: {
          approval_status?: string
          created_at?: string
          created_by_sponsor?: string | null
          description?: string
          emoji?: string | null
          end_at?: string | null
          id?: string
          is_live?: boolean
          is_pod_gate?: boolean
          points_awarded?: number
          start_at?: string | null
          title?: string
          transcript_url?: string | null
          type?: Database["public"]["Enums"]["quest_type"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_group_submission: {
        Args: { _note?: string; _submission_id: string }
        Returns: Json
      }
      claim_quest: {
        Args: { _photo_url: string; _quest_id: string }
        Returns: Json
      }
      claim_quest_anon: {
        Args: { _attendee_id: string; _photo_url: string; _quest_id: string }
        Returns: Json
      }
      gen_verify_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      meet_attendee: {
        Args: { _attendee_id: string; _code: string }
        Returns: Json
      }
      pod_component: { Args: { _attendee_id: string }; Returns: string[] }
      recalc_attendee_points: {
        Args: { _attendee_id: string }
        Returns: number
      }
      reject_group_submission: {
        Args: { _note?: string; _submission_id: string }
        Returns: undefined
      }
      verify_pod_member: {
        Args: { _code: string; _verifier_id: string }
        Returns: Json
      }
    }
    Enums: {
      ai_experience: "beginner" | "intermediate" | "power_user"
      app_role: "admin" | "user"
      event_goal:
        | "working_product"
        | "job_internship"
        | "experience"
        | "new_connections"
      quest_type: "main" | "side"
      submission_status: "pending" | "approved" | "rejected"
      track_intent:
        | "ai_for_business"
        | "creative_marketing"
        | "dev_tools_infra"
        | "fintech_payments"
        | "health_sustainability"
        | "open_track"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_experience: ["beginner", "intermediate", "power_user"],
      app_role: ["admin", "user"],
      event_goal: [
        "working_product",
        "job_internship",
        "experience",
        "new_connections",
      ],
      quest_type: ["main", "side"],
      submission_status: ["pending", "approved", "rejected"],
      track_intent: [
        "ai_for_business",
        "creative_marketing",
        "dev_tools_infra",
        "fintech_payments",
        "health_sustainability",
        "open_track",
      ],
    },
  },
} as const
