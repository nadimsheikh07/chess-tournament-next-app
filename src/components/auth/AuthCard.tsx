import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Box, Paper, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Box className="auth-page">
      <Paper className="auth-card" elevation={0}>
        <Link className="auth-back-link" href="/">
          <ArrowBackRounded fontSize="small" />
          Back to dashboard
        </Link>
        <Box className="auth-brand">
          <span className="auth-brand-mark">♔</span>
          <span>KINGDOM OF CHESS</span>
        </Box>
        <Typography component="h1" className="auth-title">
          {title}
        </Typography>
        <Typography className="auth-description">{description}</Typography>
        {children}
        <Box className="auth-footer">{footer}</Box>
      </Paper>
    </Box>
  );
}
