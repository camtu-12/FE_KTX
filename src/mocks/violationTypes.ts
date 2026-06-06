export type ViolationLevel = "MINOR" | "MEDIUM" | "SERIOUS";

export interface ViolationType {
  id: number;
  name: string;
  level: ViolationLevel;
  description: string;
  isActive: boolean;
}

export const violationTypes: ViolationType[] = [
  {
    id: 1,
    name: "Gây mất trật tự",
    level: "SERIOUS",
    description: "Gây ồn ào, mất trật tự hoặc ảnh hưởng đến sinh viên khác trong khu nội trú.",
    isActive: true,
  },
  {
    id: 2,
    name: "Tự ý đổi giường",
    level: "MEDIUM",
    description: "Tự ý đổi giường hoặc chỗ ở khi chưa có xác nhận của ban quản lý.",
    isActive: true,
  },
  {
    id: 3,
    name: "Đưa người ngoài vào phòng",
    level: "SERIOUS",
    description: "Đưa người không có phận sự vào phòng ở khi chưa được phép.",
    isActive: true,
  },
  {
    id: 4,
    name: "Phá hoại tài sản",
    level: "SERIOUS",
    description: "Làm hư hỏng tài sản ký túc xá hoặc tài sản dùng chung.",
    isActive: true,
  },
  {
    id: 5,
    name: "Không tham gia vệ sinh chung",
    level: "MINOR",
    description: "Không thực hiện lịch vệ sinh phòng hoặc khu vực sinh hoạt chung.",
    isActive: true,
  },
  {
    id: 6,
    name: "Hút thuốc trong phòng",
    level: "MEDIUM",
    description: "Hút thuốc trong phòng ở hoặc khu vực cấm hút thuốc.",
    isActive: true,
  },
  {
    id: 7,
    name: "Nấu ăn trong phòng",
    level: "MEDIUM",
    description: "Sử dụng bếp, thiết bị nấu ăn hoặc thiết bị điện trái quy định trong phòng.",
    isActive: true,
  },
  {
    id: 8,
    name: "Tàng trữ chất cấm",
    level: "SERIOUS",
    description: "Tàng trữ, sử dụng hoặc tiếp tay sử dụng chất cấm trong ký túc xá.",
    isActive: true,
  },
  {
    id: 9,
    name: "Vi phạm giờ giới nghiêm",
    level: "MINOR",
    description: "Ra vào ký túc xá sau giờ quy định khi chưa được cho phép.",
    isActive: true,
  },
  {
    id: 10,
    name: "Không đóng phí đúng hạn",
    level: "SERIOUS",
    description: "Không hoàn thành phí lưu trú hoặc các khoản phí phát sinh đúng hạn.",
    isActive: true,
  },
];
