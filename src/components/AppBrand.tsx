import stuLogo from "../assets/STU-topbar.png";

export default function AppBrand() {
  return (
    <img
      src={stuLogo}
      alt="Trường Đại học Công nghệ Sài Gòn"
      className="h-12 w-auto max-w-[14rem] object-contain sm:h-14 sm:max-w-[18rem] lg:h-16 lg:max-w-[21rem]"
    />
  );
}
