



import { Link } from "react-router-dom";
import logo from "../assets/images/logo.svg";

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  children,
  maxW = "max-w-md",
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.08),transparent_50%)]" />

      <header className="relative z-10 px-4 py-5 sm:px-10 sm:py-6">
        <Link
          to="/login"
          className="flex w-fit items-center gap-3"
          aria-label="EarnNest home"
        >
          <img
            src={logo}
            alt="EarnNest"
            className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10"
          />
          <span className="font-display text-lg font-bold text-white">
            EarnNest
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div
          className={`w-full ${maxW} rounded-2xl border border-line bg-surface p-5 sm:rounded-3xl sm:p-8`}
        >
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400 sm:h-14 sm:w-14">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <h1 className="text-center font-display text-xl font-bold text-white sm:text-2xl">
            {title}
          </h1>

          <p className="mb-6 mt-2 text-center text-sm leading-6 text-zinc-400">
            {subtitle}
          </p>

          {children}
        </div>
      </main>

      <footer className="relative z-10 px-4 py-5 text-center text-xs leading-5 text-zinc-500 sm:py-6">
        © {new Date().getFullYear()} EarnNest. All rights reserved.
      </footer>
    </div>
  );
}















// import { Link } from "react-router-dom";
// import logo from "../assets/images/logo.svg";

// export default function AuthLayout({ icon: Icon, title, subtitle, children, maxW = "max-w-md" }) {
//   return (
//     <div className="relative flex min-h-screen flex-col bg-base">
//       <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.08),transparent_50%)]" />
//       <header className="relative z-10 p-6 sm:px-10">
//         <Link to="/login" className="flex items-center gap-3">
//           <img src={logo} alt="EarnNest" className="h-10 w-10 rounded-xl" />
//           <span className="font-display text-lg font-bold text-white">EarnNest</span>
//         </Link>
//       </header>

//       <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
//         <div className={`w-full ${maxW} rounded-3xl border border-line bg-surface p-8`}>
//           <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
//             <Icon className="h-6 w-6" />
//           </div>
//           <h1 className="text-center font-display text-2xl font-bold text-white">{title}</h1>
//           <p className="mb-6 mt-2 text-center text-sm text-zinc-400">{subtitle}</p>
//           {children}
//         </div>
//       </main>

//       <footer className="relative z-10 py-6 text-center text-xs text-zinc-500">
//         © {new Date().getFullYear()} EarnNest. All rights reserved.
//       </footer>
//     </div>
//   );
// }