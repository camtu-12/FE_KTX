import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';

import { Header } from './Header';

const meta = {
  title: 'Example/Header',
  component: Header,
  // Component này sẽ có mục Autodocs được tạo tự động: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // Xem thêm cách bố trí stories tại: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
  args: {
    onLogin: fn(),
    onLogout: fn(),
    onCreateAccount: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  args: {
    user: {
      name: 'Jane Doe',
    },
  },
};

export const LoggedOut: Story = {};
