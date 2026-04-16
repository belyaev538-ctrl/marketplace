import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth/options";
import { SignOutButton } from "@/components/sign-out-button";
import type { FooterSocialLinks } from "@/lib/site-settings";
import { getFooterSocialLinks } from "@/lib/site-settings";

const footLink =
  "text-[10px] font-medium leading-[127%] text-blueNavy transition-colors hover:text-blue md:text-xs md:leading-none";

function FootColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-[7px] md:gap-[13px]">
      <b className="text-xs font-bold text-blueNavy md:text-sm">{title}</b>
      <div className="flex flex-col items-start gap-[10px]">{children}</div>
    </div>
  );
}

function hasFooterSocial(s: FooterSocialLinks) {
  return Boolean(s.telegram || s.vk || s.whatsapp || s.max);
}

function TextSocialLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] font-semibold text-blueNavy underline underline-offset-2 transition-colors hover:text-blue md:text-xs"
    >
      {children}
    </a>
  );
}

export async function Footer() {
  const session = await getServerSession(authOptions);
  const year = new Date().getFullYear();
  const social = await getFooterSocialLinks();
  const showSocial = hasFooterSocial(social);

  return (
    <footer className="mt-auto pb-14 md:pb-0">
      <div className="mx-auto w-full max-w-[1385px] px-[15px]">
        <div className="flex flex-col items-start justify-between gap-[33px] border-t border-blueSteel/30 pt-[15px] pb-[15px] md:gap-12 md:pt-[41px] md:pb-10 lg:flex-row lg:gap-[96px]">
          <div className="grid w-full grid-cols-2 items-center gap-6 md:flex md:w-auto md:flex-col md:gap-0">
            <Link href="/" className="shrink-0" aria-label="На главную">
              <Image
                src="/mlavka/img/logo.svg"
                alt=""
                width={182}
                height={31}
                className="h-[26px] w-[156px] md:h-[30.5px] md:w-[182px]"
              />
            </Link>
            <Link
              href="/login"
              prefetch={false}
              className="group flex h-[42px] w-[165px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[#036FEF] py-3.5 ps-4 pe-[13px] text-[10px] font-semibold text-[#036FEF] transition-colors hover:bg-[#036FEF] hover:text-white md:mt-[24.5px] md:h-[48px] md:w-[181px] md:text-[13px]"
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                className="shrink-0 [&_circle]:fill-[#036FEF] [&_rect]:fill-white group-hover:[&_circle]:fill-white group-hover:[&_rect]:fill-[#036FEF]"
              >
                <circle cx={8} cy={8} r={8} />
                <rect x={7} y={3} width={2} height={10} rx={1} />
                <rect
                  x={3}
                  y={9}
                  width={2}
                  height={10}
                  rx={1}
                  transform="rotate(-90 3 9)"
                />
              </svg>
              Добавить магазин
            </Link>
            {session?.user ? (
              <nav className="mt-2 flex w-full flex-col items-start gap-2 md:mt-3" aria-label="Аккаунт в футере">
                {session.user.role === "SHOP_OWNER" ? (
                  <Link
                    href="/dashboard"
                    prefetch={false}
                    className="text-[12px] font-medium text-blueNavy transition-colors hover:text-blue"
                  >
                    Кабинет
                  </Link>
                ) : null}
                <div className="flex w-full items-center gap-2">
                  <SignOutButton className="rounded-lg border border-blueExtraLight bg-white px-3 py-2 text-xs font-semibold text-blueNavy transition-colors hover:border-blue hover:bg-blueUltraLight hover:text-blue" />
                  {session.user.role === "ADMIN" ? (
                    <Link
                      href="/admin/stores"
                      prefetch={false}
                      className="inline-flex h-[34px] items-center rounded-lg border border-blueExtraLight bg-white px-3 py-2 text-xs font-semibold text-blueNavy transition-colors hover:border-blue hover:bg-blueUltraLight hover:text-blue"
                    >
                      Админка
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
            {showSocial ? (
              <div className="mt-6 hidden w-full flex-col gap-1.5 md:flex">
                <span className="text-[10px] font-medium leading-[127%] text-blueNavy md:text-xs md:leading-none">
                  Мы в соцсетях
                </span>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {social.telegram ? (
                    <a
                      href={social.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity hover:opacity-80"
                      aria-label="Telegram"
                    >
                      <Image src="/mlavka/img/telegram.svg" alt="" width={40} height={40} />
                    </a>
                  ) : null}
                  {social.vk ? (
                    <a
                      href={social.vk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity hover:opacity-80"
                      aria-label="ВКонтакте"
                    >
                      <Image src="/mlavka/img/vk.svg" alt="" width={40} height={40} />
                    </a>
                  ) : null}
                  {social.whatsapp ? (
                    <TextSocialLink href={social.whatsapp}>WhatsApp</TextSocialLink>
                  ) : null}
                  {social.max ? <TextSocialLink href={social.max}>MAX</TextSocialLink> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="-mt-1.5 grid w-full grid-cols-2 items-start justify-between gap-[23px] md:flex md:gap-5 md:pr-[71px]">
            <FootColumn title="Покупателям">
              <Link href="/catalog" prefetch={false} className={footLink}>
                Как найти магазин / сделать заказ
              </Link>
              <span className={footLink + " cursor-default"}>Доставка и самовывоз</span>
              <span className={footLink + " cursor-default"}>Безопасность покупок</span>
              <span className={footLink + " cursor-default"}>Возврат и обмен</span>
            </FootColumn>
            <FootColumn title="Продавцам">
              <Link href="/login" prefetch={false} className={footLink}>
                Стать продавцом
              </Link>
              <span className={footLink + " cursor-default"}>Преимущества для продавцов</span>
              <Link href="/login" prefetch={false} className={footLink}>
                Вход в личный кабинет продавца
              </Link>
            </FootColumn>
            <FootColumn title="Правовая информация">
              <span className={footLink + " cursor-default"}>Пользовательское соглашение</span>
              <span className={footLink + " cursor-default"}>Политика конфиденциальности</span>
              <span className={footLink + " cursor-default"}>Условия обработки данных</span>
              <span className={footLink + " cursor-default"}>Юридическая информация</span>
              <span className={footLink + " cursor-default"}>Сообщить о нарушении</span>
            </FootColumn>
            <FootColumn title="Помощь">
              <span className={footLink + " cursor-default"}>О компании</span>
              <span className={footLink + " cursor-default"}>Команда и партнёры</span>
              <span className={footLink + " cursor-default"}>Часто задаваемые вопросы</span>
              <span className={footLink + " cursor-default"}>Контакты</span>
            </FootColumn>
          </div>
        </div>
      </div>

      <div className="bg-white py-2 md:py-[14px]">
        <div className="mx-auto w-full max-w-[1385px] px-[15px]">
          <div className="flex items-center justify-start gap-[26px] md:justify-center">
            {showSocial ? (
              <div className="flex flex-wrap items-center gap-2.5 md:hidden">
                {social.telegram ? (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Telegram"
                    className="transition-opacity hover:opacity-80"
                  >
                    <Image
                      src="/mlavka/img/telegram.svg"
                      alt=""
                      width={35}
                      height={35}
                      className="min-h-[35px] min-w-[35px]"
                    />
                  </a>
                ) : null}
                {social.vk ? (
                  <a
                    href={social.vk}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="ВКонтакте"
                    className="transition-opacity hover:opacity-80"
                  >
                    <Image
                      src="/mlavka/img/vk.svg"
                      alt=""
                      width={35}
                      height={35}
                      className="min-h-[35px] min-w-[35px]"
                    />
                  </a>
                ) : null}
                {social.whatsapp ? (
                  <TextSocialLink href={social.whatsapp}>WhatsApp</TextSocialLink>
                ) : null}
                {social.max ? <TextSocialLink href={social.max}>MAX</TextSocialLink> : null}
              </div>
            ) : null}
            <p className="flex max-w-[143px] items-center justify-center text-[10px] font-medium leading-[120%] text-blueNavy md:max-w-full md:text-center md:text-xs">
              © {year} Маркетплейс. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
