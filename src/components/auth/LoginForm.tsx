"use client";

import { Alert, Box, Button, Stack, TextField } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import AuthCard from "@/components/auth/AuthCard";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    try {
      const profile = await login(values);
      router.replace(profile.role === "player" ? "/student" : "/admin");
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error, "Unable to sign in."));
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue to your chess community."
      footer={
        <>
          New to Kingdom of Chess?{" "}
          <Link href="/auth/register">Create an account</Link>
        </>
      }
    >
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          {submitError && (
            <Alert severity="error" role="alert">
              {submitError}
            </Alert>
          )}
          <Controller
            control={control}
            name="email"
            rules={{
              required: "Email is required.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Enter a valid email address.",
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoComplete="email"
                error={Boolean(fieldState.error)}
                fullWidth
                helperText={fieldState.error?.message}
                label="Email"
                type="email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{ required: "Password is required." }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoComplete="current-password"
                error={Boolean(fieldState.error)}
                fullWidth
                helperText={fieldState.error?.message}
                label="Password"
                type="password"
              />
            )}
          />
          <Button
            disabled={formState.isSubmitting}
            fullWidth
            size="large"
            type="submit"
            variant="contained"
          >
            {formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </Stack>
      </Box>
    </AuthCard>
  );
}
