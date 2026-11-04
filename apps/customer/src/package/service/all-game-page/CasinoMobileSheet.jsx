import { Sheet } from "framework7-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useGameLaunch, CATEGORY_TYPE, LAUNCH_TYPE } from "../launch-game";
import { open_login } from "@my-common-tool/tool/login-register";
import { useTokenAndUser } from "../../../components/action/user-data";
import useCasinoCatalogDataNew, {
  CASINO_STATUS_COMING_SOON,
  CASINO_STATUS_MAINTENANCE,
} from "./useCasinoCatalogDataNew";

const CasinoMobileSheet = ({ opened, onClose, sheetTab, setSheetTab }) => {
  const { t } = useTranslation();
  const { token } = useTokenAndUser();
  const { launch_game } = useGameLaunch();

  const { fullCategoryList, selectedCategoryItem, updateSelectedGameCategory } =
    useCasinoCatalogDataNew();

  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [gamesSearchTerm, setGamesSearchTerm] = useState("");
  const [isSheetScrolled, setIsSheetScrolled] = useState(false);
  const sheetContainerRef = useRef(null);

  useEffect(() => {
    if (!opened) {
      setCategorySearchTerm("");
      setGamesSearchTerm("");
      setIsSheetScrolled(false);
    }
  }, [opened]);

  useEffect(() => {
    const container = sheetContainerRef.current;
    if (!container) {
      setIsSheetScrolled(false);
      return undefined;
    }

    if (opened) {
      container.scrollTop = 0;
    }

    const handleScroll = () => {
      setIsSheetScrolled(container.scrollTop > 10);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [opened]);

  const sheetGameList = useMemo(
    () =>
      fullCategoryList.map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        games: (c.products ?? []).map((prod, i) => ({
          ...prod,
          id: prod?.id ?? prod?.code ?? i,
          category: c?.id ?? c._raw?.category,
          name: prod?.name,
          image: prod?.image,
          provider: c.name,
          provider_image: c.image,
          categories: prod?.categories ?? [],
        })),
      })),
    [fullCategoryList],
  );

  const categoryRows = useMemo(
    () =>
      // Keep provider count consistent with AllGamePage dropdown visibility rules.
      fullCategoryList.map((i, idx) => ({
        id: i?.id ?? idx,
        name: i?.name ?? "",
        value: i?.id,
        productCount: (() => {
          const products = Array.isArray(i?.products) ? i.products : [];
          if (!products.length) return 0;

          const noAnyProviderHaveSmallGameList = products.every(
            (product) => String(product?.type) !== String(CATEGORY_TYPE.lobby),
          );

          return noAnyProviderHaveSmallGameList ? 1 : products.length;
        })(),
        _raw: i?._raw,
        productType: i?._raw?.type,
      })),
    [fullCategoryList],
  );

  const filteredGameList = useMemo(() => {
    const search = String(gamesSearchTerm ?? "")
      ?.trim()
      .toLowerCase();
    if (!search) {
      return sheetGameList;
    }
    return sheetGameList
      .map((provider) => {
        const providerName = provider?.name?.toLowerCase() || "";
        const matchesProvider = providerName.includes(search);
        const matchingGames = (provider?.games || []).filter((game) =>
          game?.name?.toLowerCase().includes(search),
        );
        if (!matchesProvider && !matchingGames.length) {
          return null;
        }
        return {
          ...provider,
          games: matchesProvider ? provider?.games || [] : matchingGames,
        };
      })
      .filter(Boolean);
  }, [sheetGameList, gamesSearchTerm]);

  const filteredCategoryList = useMemo(() => {
    const search = categorySearchTerm?.trim().toLowerCase();
    if (!search) {
      return categoryRows;
    }
    return categoryRows.filter((category) =>
      category?.name?.toLowerCase().includes(search),
    );
  }, [categoryRows, categorySearchTerm]);

  const flattenedFilteredGames = useMemo(() => {
    const search = String(gamesSearchTerm ?? "")?.trim();
    if (!search) {
      return [];
    }
    return filteredGameList.flatMap((provider) =>
      (provider?.games || []).map((game) => ({
        ...game,
        providerId: provider?.id,
      })),
    );
  }, [filteredGameList, gamesSearchTerm]);

  const getNormalizedStatus = (value) => {
    const normalizedNumber = Number(value);
    if (
      normalizedNumber === CASINO_STATUS_MAINTENANCE ||
      normalizedNumber === CASINO_STATUS_COMING_SOON
    ) {
      return normalizedNumber;
    }

    const normalizedText = String(value ?? "")
      ?.trim()
      .toLowerCase();
    if (normalizedText === "maintenance") {
      return CASINO_STATUS_MAINTENANCE;
    }
    if (normalizedText === "coming soon" || normalizedText === "comming soon") {
      return CASINO_STATUS_COMING_SOON;
    }

    return null;
  };

  const getGameEffectiveStatus = (game) => {
    const gameLevelStatus = getNormalizedStatus(
      game?.status ?? game?.game_status ?? game?.product_status,
    );
    if (gameLevelStatus) return gameLevelStatus;
    return getNormalizedStatus(game?.provider_status);
  };

  const handleOpenGame = async (game) => {
    if (!token) {
      onClose();
      open_login();
      return;
    }

    const effectiveStatus = getGameEffectiveStatus(game);
    if (
      effectiveStatus === CASINO_STATUS_MAINTENANCE ||
      effectiveStatus === CASINO_STATUS_COMING_SOON
    ) {
      return;
    }
    try {
      onClose();
      await launch_game({
        code: game?.code,
        game_code: game?.game_code,
        type: game?.type,
        gameItem: game,
        category: game?.category,
      });
    } catch (error) {
      console.error("Failed to launch game:", error);
    }
  };

  const handleCategoryClick = (
    categoryRow,
    { closeSheet: shouldClose } = {},
  ) => {
    if (categoryRow?._raw) {
      updateSelectedGameCategory(categoryRow._raw);
    }
    if (shouldClose) {
      onClose();
    }
  };

  const handleSheetSearchChange = (event) => {
    const { value } = event.target;
    if (sheetTab === "games") {
      setGamesSearchTerm(value);
    } else if (sheetTab === "category") {
      setCategorySearchTerm(value);
    }
  };

  const sheetTitleMap = {
    games: t("Search"),
    providers: t("Providers"),
    category: t("Category"),
  };

  const sheetTitle = sheetTitleMap[sheetTab] || t("Games");
  const currentSheetSearchTerm =
    sheetTab === "games"
      ? gamesSearchTerm
      : sheetTab === "category"
        ? categorySearchTerm
        : "";

  const selectedCategoryValue = selectedCategoryItem?.category;

  const sheetLayer =
    opened && typeof document !== "undefined" ? (
      <div
        className="casino-mobile-sheet-portal"
        style={{ display: "contents" }}
      >
        <div
          className="casino-sheet-backdrop"
          role="button"
          tabIndex={0}
          aria-label={t("Close sheet")}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <Sheet
          className="casino-sheet"
          style={{ height: "90%" }}
          opened={opened}
          backdrop={false}
          onSheetClosed={onClose}
        >
          <div
            className={`casino-sheet-container ${isSheetScrolled ? "scrolled" : ""}`}
            ref={sheetContainerRef}
          >
            <div
              className={`casino-sheet-floating-header ${isSheetScrolled ? "visible" : ""}`}
            >
              <div className="floating-header-content">
                <span className="floating-header-title">{sheetTitle}</span>
                <div
                  type="button"
                  className="floating-header-close"
                  onClick={onClose}
                  aria-label={t("Close sheet")}
                >
                  <i className="f7-icons">xmark</i>
                </div>
              </div>
            </div>
            <div className="casino-sheet-header">
              <span className="casino-sheet-title">{sheetTitle}</span>
              <div
                className="casino-sheet-close"
                role="button"
                tabIndex={0}
                onClick={onClose}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClose();
                  }
                }}
              >
                <i className="f7-icons">xmark</i>
              </div>
            </div>
            <div className="casino-sheet-tabs" role="tablist">
              <div
                className={`casino-sheet-tab font-large font-bold ${sheetTab === "games" ? "active" : ""}`}
                role="tab"
                tabIndex={0}
                aria-selected={sheetTab === "games"}
                onClick={() => setSheetTab("games")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSheetTab("games");
                  }
                }}
              >
                {t("Games")}
              </div>
              <div
                className={`casino-sheet-tab font-large font-bold ${sheetTab === "category" ? "active" : ""}`}
                role="tab"
                tabIndex={0}
                aria-selected={sheetTab === "category"}
                onClick={() => setSheetTab("category")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSheetTab("category");
                  }
                }}
              >
                {t("Category")}
              </div>
            </div>
            <div className="casino-sheet-search form-field-login-outline">
              <i className="f7-icons casino-search-bar-icon">search</i>
              <input
                type="text"
                placeholder={t("Search")}
                value={currentSheetSearchTerm}
                onChange={handleSheetSearchChange}
                aria-label={t("Search")}
              />
            </div>
            <div className="casino-sheet-body">
              {sheetTab === "games" && (
                <>
                  {String(gamesSearchTerm ?? "")?.trim() ? (
                    flattenedFilteredGames.length ? (
                      <div className="games-search-grid">
                        {flattenedFilteredGames.map((game) => (
                          <div
                            className="games-search-grid-card"
                            key={`${game?.providerId ?? "game"}-${game?.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenGame(game)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleOpenGame(game);
                              }
                            }}
                          >
                            <img src={game?.image} draggable={false} alt="" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="casino-empty-state">
                        {t("No games found.")}
                      </div>
                    )
                  ) : filteredGameList.length ? (
                    filteredGameList.map((provider) => (
                      <div className="games-section" key={provider?.id}>
                        <div className="games-header">
                          <div className="games-info">
                            <span className="games-name font-x-large">
                              {provider?.name}
                            </span>
                          </div>
                        </div>
                        <div className="games-list-container games-list-grid-3">
                          {provider?.games?.map((game) => (
                            <div
                              className="game-card"
                              key={game?.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenGame(game)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleOpenGame(game);
                                }
                              }}
                            >
                              <div className="game-card-image">
                                <img
                                  src={game?.image}
                                  draggable={false}
                                  alt=""
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="casino-empty-state">
                      {t("No games found.")}
                    </div>
                  )}
                </>
              )}
              {sheetTab === "category" && (
                <div className="category-section" role="list">
                  {filteredCategoryList.length ? (
                    <div className="category-grid">
                      {filteredCategoryList.map((category) => {
                        const isSelected =
                          selectedCategoryValue !== undefined &&
                          selectedCategoryValue !== null &&
                          String(selectedCategoryValue) ===
                            String(category?.value);

                        const count = category?.productCount ?? 0;
                        const showCount = count > 1;

                        return (
                          <div
                            key={category?.id}
                            className={`category-card ${isSelected ? "selected" : ""}`}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() =>
                              handleCategoryClick(category, {
                                closeSheet: true,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleCategoryClick(category, {
                                  closeSheet: true,
                                });
                              }
                            }}
                          >
                            <div className="category-card-header">
                              <span className="category-card-name">
                                {category?.name}
                              </span>
                              {isSelected && (
                                <i className="f7-icons category-card-check">
                                  checkmark_circle_fill
                                </i>
                              )}
                            </div>
                            {/* {showCount && (
                              <span className="category-card-count">
                                {count} {t(count === 1 ? "provider" : "providers")}
                              </span>
                            )} */}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="casino-empty-state">
                      {t("No categories found.")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      </div>
    ) : null;

  return sheetLayer;
};

export default CasinoMobileSheet;
