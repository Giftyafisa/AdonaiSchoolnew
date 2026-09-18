export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      applications: {
        Row: {
          id: string; parent_name: string; child_name: string; class_applying_for: string; phone: string; email: string;
          date_of_birth: string | null; religion: string | null; tribe: string | null; previous_school: string | null;
          mother_name: string | null; mother_language: string | null; mother_occupation: string | null; mother_phone: string | null;
          father_name: string | null; father_language: string | null; father_occupation: string | null; father_phone: string | null;
          location: string | null; house_number: string | null; notes: string | null; internal_notes: string | null;
          documents: Json; status: string; archived: boolean; archived_at: string | null; archived_by: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; parent_name: string; child_name: string; class_applying_for: string; phone: string; email: string;
          date_of_birth?: string | null; religion?: string | null; tribe?: string | null; previous_school?: string | null;
          mother_name?: string | null; mother_language?: string | null; mother_occupation?: string | null; mother_phone?: string | null;
          father_name?: string | null; father_language?: string | null; father_occupation?: string | null; father_phone?: string | null;
          location?: string | null; house_number?: string | null; notes?: string | null; internal_notes?: string | null;
          documents?: Json; status?: string; archived?: boolean; archived_at?: string | null; archived_by?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [];
      };
      gallery_items: {
        Row: {
          id: string; image_url: string | null; media_url: string; media_type: string; mime_type: string | null; file_path: string | null;
          caption: string; category: string; sort_order: number; published: boolean; approval_status: string;
          author_id: string | null; reviewed_by: string | null; reviewed_at: string | null; review_notes: string | null;
          created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; image_url?: string | null; media_url: string; media_type?: string; mime_type?: string | null; file_path?: string | null;
          caption: string; category?: string; sort_order?: number; published?: boolean; approval_status?: string;
          author_id?: string | null; reviewed_by?: string | null; reviewed_at?: string | null; review_notes?: string | null;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery_items"]["Insert"]>;
        Relationships: [];
      };
      news_posts: {
        Row: {
          id: string; title: string; slug: string; excerpt: string | null; body: string | null; image_url: string | null;
          cover_media_type: string; cover_video_url: string | null; document_url: string | null; document_name: string | null; document_path: string | null;
          category: string; published: boolean; published_at: string | null; approval_status: string; author_id: string | null;
          reviewed_by: string | null; reviewed_at: string | null; review_notes: string | null; archived: boolean; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; title: string; slug: string; excerpt?: string | null; body?: string | null; image_url?: string | null;
          cover_media_type?: string; cover_video_url?: string | null; document_url?: string | null; document_name?: string | null; document_path?: string | null;
          category?: string; published?: boolean; published_at?: string | null; approval_status?: string; author_id?: string | null;
          reviewed_by?: string | null; reviewed_at?: string | null; review_notes?: string | null; archived?: boolean; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["news_posts"]["Insert"]>;
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          user_id: string; email: string; display_name: string; is_super_admin: boolean; is_active: boolean;
          can_admissions: boolean; can_gallery: boolean; can_news: boolean; can_publish: boolean; must_change_password: boolean;
          created_at: string; updated_at: string;
        };
        Insert: {
          user_id: string; email?: string; display_name?: string; is_super_admin?: boolean; is_active?: boolean;
          can_admissions?: boolean; can_gallery?: boolean; can_news?: boolean; can_publish?: boolean; must_change_password?: boolean;
          created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["staff_profiles"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: { id: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at: string };
        Insert: { id?: string; user_id: string; role: Database["public"]["Enums"]["app_role"]; created_at?: string };
        Update: { id?: string; user_id?: string; role?: Database["public"]["Enums"]["app_role"]; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean };
      has_staff_permission: { Args: { _permission: string; _user_id: string }; Returns: boolean };
      has_super_admin: { Args: { _user_id: string }; Returns: boolean };
      mark_password_changed: { Args: { _user_id: string }; Returns: null };
    };
    Enums: { app_role: "admin" | "user" };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">];

export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals }, TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Row: infer R } ? R : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals }, TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals }, EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicSchemaCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals }, CompositeTypeName extends PublicSchemaCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[PublicSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicSchemaCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals } ? DatabaseWithoutInternals[PublicSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicSchemaCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicSchemaCompositeTypeNameOrOptions] : never;

export const Constants = { public: { Enums: { app_role: ["admin", "user"] } } } as const;
