import type { Meta, StoryObj } from "@storybook/react-vite";
import Header from "./Header";

const meta = {
  title: "Components/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Student: Story = {
  args: {
    role: "student",
    userName: "Student User",
    userEmail: "student@gmail.com",
    studentCode: "SV001",
    isSidebarOpen: true,
    onToggleSidebar: () => undefined,
    onLogout: () => undefined,
  },
};

export const Admin: Story = {
  args: {
    role: "admin",
    userName: "Admin User",
    onLogout: () => undefined,
  },
};
