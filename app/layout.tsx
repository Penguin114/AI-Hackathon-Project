import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "Escape Academy — Learn your way out",
  description: "Turn anything you want to learn into an escape-room adventure.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}