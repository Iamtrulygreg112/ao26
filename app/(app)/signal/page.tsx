import { redirect } from "next/navigation";

/** The old reactions view lives on as the Chats experience. */
export default function SignalPage() {
  redirect("/chats");
}
