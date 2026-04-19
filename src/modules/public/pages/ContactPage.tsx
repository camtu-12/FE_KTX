export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:py-16">
      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm lg:p-10">
        <h1 className="text-3xl font-bold text-[var(--color-title)]">Liên hệ</h1>

        <div className="mt-5 space-y-3 text-base text-[var(--color-content)]">
          <p>Email hỗ trợ: hotro.ktx@stu.edu.vn</p>
          <p>Hotline: 1900 1234</p>
          <p>Địa chỉ: Ký túc xá STU, Quận 9, TP. Hồ Chí Minh</p>
        </div>
      </section>
    </div>
  );
}
