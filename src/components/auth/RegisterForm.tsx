"use client";

import { Alert, Box, Button, Stack, TextField } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import AuthCard from "@/components/auth/AuthCard";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const { register: createAccount } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, getValues, handleSubmit, formState } =
    useForm<RegisterFormValues>({
      defaultValues: {
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      },
    });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);
    try {
      await createAccount({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      router.replace("/admin");
    } catch (error) {
      setSubmitError(
        getAuthErrorMessage(error, "Unable to create your account."),
      );
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Join your chess community and find your next game."
      footer={
        <>
          Already registered? <Link href="/auth/login">Sign in</Link>
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
            name="name"
            rules={{
              required: "Name is required.",
              minLength: {
                value: 2,
                message: "Name must be at least 2 characters.",
              },
              validate: (value) =>
                value.trim().length > 0 || "Name is required.",
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoComplete="name"
                error={Boolean(fieldState.error)}
                fullWidth
                helperText={fieldState.error?.message}
                label="Full name"
              />
            )}
          />
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
            rules={{
              required: "Password is required.",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters.",
              },
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoComplete="new-password"
                error={Boolean(fieldState.error)}
                fullWidth
                helperText={fieldState.error?.message}
                label="Password"
                type="password"
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: "Please confirm your password.",
              validate: (value) =>
                value === getValues("password") || "Passwords do not match.",
            }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoComplete="new-password"
                error={Boolean(fieldState.error)}
                fullWidth
                helperText={fieldState.error?.message}
                label="Confirm password"
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
            {formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </Stack>
      </Box>
    </AuthCard>
  );
}
