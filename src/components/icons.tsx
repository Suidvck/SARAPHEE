import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Filled({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

function Stroked({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LeafMark(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M20 4c-8.5 0-14.5 4.6-15.8 11.2-.4 2.2.2 4 .9 4.8.7-2.6 2.3-6.4 6.4-9.3-2.6 3.2-4.2 7.2-4.5 10.3 1 .4 2.6.6 4.3.3C17.6 20.2 20.6 12.5 20 4Z" />
    </Filled>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </Filled>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
    </Filled>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </Filled>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.02 1.5-3.34z" />
    </Filled>
  );
}

export function IconPushPin(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </Filled>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </Filled>
  );
}

export function IconMedal(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z" />
    </Filled>
  );
}

export function IconThermo(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-2V5c0-.55.45-1 1-1s1 .45 1 1v1h-1v1h1v2h-1v1h1v2h-2z" />
    </Filled>
  );
}

export function IconMusic(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </Filled>
  );
}

export function IconPeople(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </Filled>
  );
}

export function IconPersonAdd(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </Filled>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </Filled>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.07-.12.15-.22.22-.35C8.39 10.92 12 4 12 4h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C14.96 15.42 11 21 11 21z" />
    </Filled>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </Filled>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z" />
    </Filled>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </Filled>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </Filled>
  );
}

export function IconRun(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z" />
    </Filled>
  );
}

export function BallSoccer(props: IconProps) {
  return (
    <Stroked {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5l3.05 2.22-1.16 3.58h-3.78l-1.16-3.58L12 7.5z" />
      <path d="M12 3.5v4M19.4 8.6l-3.35 1.12M20.2 15.7l-3.8-.4M14.9 20.1l-1.01-3.3M9.1 20.1l1.01-3.3M3.8 15.7l3.8-.4M4.6 8.6l3.35 1.12" />
    </Stroked>
  );
}

export function BallVolley(props: IconProps) {
  return (
    <Stroked {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.9 9.6c2.9 1.1 6.6 1 10.3-.8" />
      <path d="M12.2 3.6c-2.3 2.3-3.2 5.8-2.6 9.4" />
      <path d="M5.6 18.5c1.9-3.6 5.1-6 9.8-6.6" />
      <path d="M18.9 6.2c-1.7 2.1-2.2 4.6-1.8 7.2" />
    </Stroked>
  );
}

export function BallBasket(props: IconProps) {
  return (
    <Stroked {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.6 3.2 2.6 13.8 0 17" />
      <path d="M5.2 5.2c2.4 2.4 2.4 11.2 0 13.6M18.8 5.2c-2.4 2.4-2.4 11.2 0 13.6" />
    </Stroked>
  );
}

export function BallChair(props: IconProps) {
  return (
    <Stroked {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.2 9.3c2.5 1.6 13.1 1.6 15.6 0" />
      <path d="M4.2 14.7c2.5-1.6 13.1-1.6 15.6 0" />
      <path d="M8 4c-1.8 5-1.8 11 0 16M16 4c1.8 5 1.8 11 0 16" />
    </Stroked>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
    </Filled>
  );
}

export function IconCloud(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
    </Filled>
  );
}

export function IconDrop(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z" />
    </Filled>
  );
}

export function IconWind(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5zm-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5h-2c0 1.93 1.57 3.5 3.5 3.5S22 14.43 22 12.5s-1.57-3.5-3.5-3.5z" />
    </Filled>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
    </Filled>
  );
}
