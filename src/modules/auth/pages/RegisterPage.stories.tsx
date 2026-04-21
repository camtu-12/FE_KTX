import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";

const meta = {
  title: "Modules/Auth/RegisterPage",
  component: RegisterPage,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/register"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof RegisterPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
