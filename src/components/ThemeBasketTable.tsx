import './ThemeBasketTable.css';
import { formatR, gradeOf } from '../lib/basket';
import type { ThemeBasket } from '../lib/types';

interface ThemeBasketTableProps {
  theme: ThemeBasket;
  good: number;
  watch: number;
  /** 테마 이름 줄을 감출 때 — 시트 제목이 이미 테마 이름인 경우 */
  hideName?: boolean;
}

/** 테마 하나의 기준 종목표. 헤더(이름·종목수·응집도) + 종목/상관도 2열. */
export function ThemeBasketTable({ theme, good, watch, hideName }: ThemeBasketTableProps) {
  return (
    <section className="basket-theme">
      <div className="basket-theme-head">
        {!hideName && <h3 className="basket-theme-name">{theme.name}</h3>}
        <span className="basket-theme-count">{theme.stocks.length}종목</span>
        <span className={`basket-cohesion basket-cohesion-${gradeOf(theme.cohesion, good, watch)}`}>
          응집도 {formatR(theme.cohesion)}
        </span>
      </div>
      <table className="basket-table">
        <thead>
          <tr>
            <th scope="col">종목</th>
            <th scope="col" className="basket-col-r">
              상관도
            </th>
          </tr>
        </thead>
        <tbody>
          {theme.stocks.map((s) => (
            <tr key={s.code}>
              <td>
                {s.name} <span className="basket-code">({s.code})</span>
              </td>
              <td className={`basket-col-r basket-r-${gradeOf(s.r, good, watch)}`}>{formatR(s.r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
