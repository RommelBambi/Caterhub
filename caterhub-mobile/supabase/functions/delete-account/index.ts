// Supabase Edge Function to delete user account
// This function deletes the user from both auth.users and public.users
// 
// Deploy this function to Supabase:
// 1. Create the function: supabase functions new delete-account
// 2. Copy this code to supabase/functions/delete-account/index.ts
// 3. Deploy: supabase functions deploy delete-account

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Missing password" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify password by re-authenticating
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service role for deleting auth user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete user from public.users table first (to avoid foreign key issues)
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", user.id);

    if (dbError) {
      console.error("Error deleting from users table:", dbError);
      return new Response(
        JSON.stringify({
          error: dbError.message || "Failed to delete user from database",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete user from auth.users (this will cascade delete related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({
          error: deleteError.message || "Failed to delete user from authentication",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete user's storage files (profile image, etc.)
    try {
      // Delete profile image from avatars bucket
      try {
        const { data: avatarFiles } = await supabaseAdmin.storage
          .from("avatars")
          .list(`profiles/${user.id}`);
        
        if (avatarFiles && avatarFiles.length > 0) {
          const avatarPaths = avatarFiles.map(
            (f) => `profiles/${user.id}/${f.name}`
          );
          await supabaseAdmin.storage.from("avatars").remove(avatarPaths);
        }
      } catch (error) {
        console.warn("Error deleting profile images:", error);
      }

      // Delete documents from partner-documents bucket (if any)
      try {
        const { data: docFiles } = await supabaseAdmin.storage
          .from("partner-documents")
          .list(user.id);
        
        if (docFiles && docFiles.length > 0) {
          const docPaths = docFiles.map((f) => `${user.id}/${f.name}`);
          await supabaseAdmin.storage.from("partner-documents").remove(docPaths);
        }
      } catch (error) {
        console.warn("Error deleting documents:", error);
      }
    } catch (storageError) {
      console.warn("Error deleting storage files:", storageError);
      // Don't fail the request if storage deletion fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in delete-account function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

