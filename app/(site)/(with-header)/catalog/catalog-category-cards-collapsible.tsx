import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Сетка карточек категорий на витрине каталога (все карточки видны сразу). */
export function CatalogCategoryCardsCollapsible({ children }: Props) {
  return (
    <div className="flex w-full flex-col gap-[27px]">
      <div>
        <div className="catalog-category-cards-wrap relative grid grid-cols-2 gap-x-[15px] gap-y-[10px] md:grid-cols-4 md:gap-x-[25px] md:gap-y-[18px] lg:grid-cols-5">
          {children}
        </div>
      </div>
    </div>
  );
}
