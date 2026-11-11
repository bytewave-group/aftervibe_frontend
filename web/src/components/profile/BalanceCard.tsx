import { CountUp } from "@/components/ui/CountUp";
import { getT } from "@/i18n/get-locale";
import Image from "next/image";
import { ForwardLink } from "@/components/navigation/ForwardLink";

export async function BalanceCard({ balance }: { balance: number }) {
  const { t } = await getT();

  return (
    <section className="anim-fade-up relative mx-6 mt-[25px] h-[153px] overflow-hidden rounded-[10px] [--stagger:1]">
      <div className="absolute inset-0 bg-gradient-to-l from-[#fd54b1] to-[#fda565]" />
      <div className="pointer-events-none absolute top-[24.26%] left-[57.56%] h-[131.95%] w-[51.5%] opacity-56">
        <Image
          src="/images/diamond.png"
          alt=""
          fill
          sizes="202px"
          className="object-contain object-left-top"
        />
      </div>

      <div className="relative z-10 px-[20px] pt-[19px]">
        <div className="flex items-start justify-between">
          <h2 className="text-[20px] leading-none font-bold text-white">
            {t("profile.balance")}
          </h2>
          <ForwardLink
            href="/recharge"
            className="anim-press flex h-[30px] w-[90px] items-center justify-center rounded-[5px] bg-gradient-to-l from-[rgba(253,84,177,0.2)] to-[rgba(253,165,101,0.2)] text-[14px] leading-none font-bold text-white no-underline"
          >
            {t("profile.recharge")}
          </ForwardLink>
        </div>
        <p className="mt-[25px] text-[40px] leading-none font-bold text-white tabular-nums">
          <CountUp value={balance} decimals={2} />
        </p>
      </div>
    </section>
  );
}
