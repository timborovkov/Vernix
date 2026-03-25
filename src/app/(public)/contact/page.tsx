import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — Vernix",
  description:
    "Get in touch with the Vernix team for questions, bug reports, feature requests, or enterprise inquiries.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="mb-2 text-center text-3xl font-bold">Get in touch</h1>
      <p className="text-muted-foreground mb-12 text-center">
        Pick a topic and we&apos;ll get back to you within 24 hours.
      </p>
      <ContactForm />
    </div>
  );
}
