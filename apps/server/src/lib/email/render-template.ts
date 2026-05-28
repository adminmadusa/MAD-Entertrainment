import { render } from "@react-email/render";
import * as React from "react";

/**
 * Renders a React element to a responsive HTML string.
 */
export async function renderTemplate(
  element: React.ReactElement,
): Promise<string> {
  return render(element);
}
