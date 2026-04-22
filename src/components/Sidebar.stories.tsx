import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Student: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <div className="min-h-screen bg-[#edf2f8] p-4">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    role: "student",
  },
};

export const Admin: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <div className="min-h-screen bg-[#edf2f8] p-4">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    role: "admin",
  },
};
