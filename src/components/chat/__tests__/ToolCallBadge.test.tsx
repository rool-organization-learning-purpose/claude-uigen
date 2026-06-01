import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

function makeTool(
  toolName: string,
  args: Record<string, unknown>,
  state = "result",
  result: unknown = "Success"
) {
  return { toolName, toolCallId: "test-id", args, state, result };
}

// str_replace_editor labels
test("ToolCallBadge shows 'Creating' for str_replace_editor create", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows 'Editing' for str_replace_editor str_replace", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "str_replace", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows 'Editing' for str_replace_editor insert", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "insert", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows 'Reading' for str_replace_editor view", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "view", path: "/App.jsx" })} />);
  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("ToolCallBadge shows 'Undoing edit' for str_replace_editor undo_edit", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })} />);
  expect(screen.getByText("Undoing edit /App.jsx")).toBeDefined();
});

// file_manager labels
test("ToolCallBadge shows 'Deleting' for file_manager delete", () => {
  render(<ToolCallBadge tool={makeTool("file_manager", { command: "delete", path: "/old.jsx" })} />);
  expect(screen.getByText("Deleting /old.jsx")).toBeDefined();
});

test("ToolCallBadge shows 'Renaming' for file_manager rename", () => {
  render(<ToolCallBadge tool={makeTool("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })} />);
  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});

// Fallback
test("ToolCallBadge shows fallback label for unknown tool", () => {
  render(<ToolCallBadge tool={makeTool("unknown_tool", {})} />);
  expect(screen.getByText("Updating files")).toBeDefined();
});

// Labels without path
test("ToolCallBadge handles missing path gracefully", () => {
  render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "create" })} />);
  expect(screen.getByText("Creating")).toBeDefined();
});

// State indicators
test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(<ToolCallBadge tool={makeTool("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when pending", () => {
  const { container } = render(
    <ToolCallBadge tool={makeTool("str_replace_editor", { command: "create", path: "/App.jsx" }, "call", null)} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});
