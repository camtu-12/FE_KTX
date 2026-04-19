export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:py-16">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm lg:p-10">
        <h1 className="text-3xl font-bold text-[var(--color-title)]">Giới thiệu</h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--color-content)]">
          Hệ thống quản lý ký túc xá STU được xây dựng nhằm số hóa toàn bộ quy
          trình nội trú: đăng ký, xét duyệt, quản lý phòng, theo dõi hợp đồng và
          hỗ trợ sinh viên. Nền tảng mang lại trải nghiệm minh bạch, nhanh chóng
          và thuận tiện cho cả sinh viên lẫn ban quản lý.
        </p>
      </section>
    </div>
  );
}
