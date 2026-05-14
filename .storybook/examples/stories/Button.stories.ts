import type { Meta, StoryObj } from '@storybook/react-vite';

import { fn } from 'storybook/test';

import { Button } from './Button';

// Xem thêm cách thiết lập stories tại: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Example/Button',
  component: Button,
  parameters: {
    // Tham số tùy chọn để căn giữa component trong Canvas. Xem thêm: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // Component này sẽ có mục Autodocs được tạo tự động: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // Xem thêm về argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    backgroundColor: { control: 'color' },
  },
  // Dùng `fn` để theo dõi arg onClick, sẽ xuất hiện trong bảng actions khi được gọi: https://storybook.js.org/docs/essentials/actions#story-args
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Xem thêm về cách viết stories với args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    label: 'Button',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    label: 'Button',
  },
};
