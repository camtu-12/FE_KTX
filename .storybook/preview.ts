import type { Preview } from '@storybook/react-vite'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - chỉ hiển thị vi phạm a11y trong UI test
      // 'error' - làm fail CI khi có vi phạm a11y
      // 'off' - bỏ qua toàn bộ kiểm tra a11y
      test: 'todo'
    }
  },
};

export default preview;
