import { RequireAuthTap } from "@/components/auth/RequireAuthTap";
import { SafeImage } from "@/components/media/SafeImage";
import { getT } from "@/i18n/get-locale";
import {
  metricIcons,
  rankingHeaderClass,
  type RankingListData,
} from "@/lib/mock/home";

interface RankingListProps {
  data: RankingListData & { title: string };
  empty?: string;
}

export async function RankingList({ data, empty }: RankingListProps) {
  const { t } = await getT();
  const metricIcon = metricIcons[data.metric];
  const metricLabel = t(`home.metrics.${data.metric}`);

  return (
    <section className="w-full" aria-labelledby={`ranking-${data.id}-title`}>
      <div
        className={`flex h-[40px] items-center justify-center rounded-[10px] ${rankingHeaderClass[data.variant]}`}
      >
        <h2
          id={`ranking-${data.id}-title`}
          className="text-[16px] leading-none font-bold text-white"
        >
          {data.title}
        </h2>
      </div>

      {data.entries.length === 0 ? (
        <p className="mt-[5px] py-3 text-center text-[13px] leading-none text-white/50">
          {empty}
        </p>
      ) : (
      <ol className="anim-stagger mt-[5px] flex flex-col gap-[5px]">
        {data.entries.map((entry) => (
          <li key={entry.id}>
            <RequireAuthTap
              href="/"
              className="flex h-[40px] w-full items-center bg-[#242424] pr-[23px] pl-[16px] text-left"
            >
              <span className="w-[9px] text-center text-[16px] leading-none font-bold text-white">
                {entry.rank}
              </span>

              <div className="relative ml-[13px] size-[35px] shrink-0 overflow-hidden rounded-full bg-[#3a3a3a]">
                {entry.avatar ? (
                  <SafeImage
                    src={entry.avatar}
                    alt=""
                    fill
                    sizes="35px"
                    className="object-cover"
                    style={{
                      objectPosition:
                        entry.objectPosition ??
                        (entry.avatarFit === "top" ? "50% 0%" : "50% 50%"),
                    }}
                  />
                ) : null}
              </div>

              {entry.badge ? (
                <SafeImage
                  src={entry.badge}
                  alt=""
                  width={40}
                  height={40}
                  className="ml-[6px] size-[40px] shrink-0 object-contain"
                  fallback="/images/badge-s6.png"
                />
              ) : (
                <span className="ml-[6px] size-[40px] shrink-0" />
              )}

              <span className="min-w-0 flex-1 truncate text-[14px] leading-none font-bold text-white">
                {entry.name}
              </span>

              <span className="ml-auto flex shrink-0 items-center">
                <SafeImage
                  src={metricIcon}
                  alt={metricLabel}
                  width={16}
                  height={16}
                  className="mr-[19px] size-[16px]"
                />
                <span className="min-w-[32px] text-right text-[14px] leading-none font-bold text-white tabular-nums">
                  {entry.amount}
                </span>
              </span>
            </RequireAuthTap>
          </li>
        ))}
      </ol>
      )}
    </section>
  );
}
