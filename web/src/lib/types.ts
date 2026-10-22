export type Verdict = '알짜' | '거품' | '보통';

export interface Source {
  name: string;
  dataset_id: 'OA-12914' | 'OA-15572' | 'station-coords';
  url: string;
  period: string;
  license: string;
}

export interface Meta {
  sources: Source[];
  subway_month: string;
  subway_month_requested: string;
  subway_substituted: boolean;
  substitution_note: string | null;
  commercial_period: string;
  generated_at: string;
  generator: string;
  methodology?: string[];
}

export interface Industry {
  name: string;
  sales_eok: number;
  rank: number;
}

export interface Station {
  id: string;
  name: string;
  line: string;
  lat: number | null;
  lng: number | null;
  flow_type: '도착형' | '출발형' | '균형형';
  daily_passengers: number;
  pass_rank: number;
  sales_eok: number;
  sales_rank: number;
  gap: number;
  verdict: Verdict;
  commercial_area: string;
  commercial_areas_matched: string[];
  industries: Industry[];
  explanation: string;
}

export interface StationsData {
  meta: Meta;
  stations: Station[];
}

export type RankedStation = Pick<Station, 'id' | 'name' | 'pass_rank' | 'sales_rank' | 'gap'>;

export interface SummaryData {
  meta: Meta;
  n_stations: number;
  regression: {
    r2: number;
    slope: number;
    intercept: number;
    p_value: number;
    x_unit: string;
    y_unit: string;
  };
  spearman: { rho: number; p_value: number };
  readme_reference: { r2: number; rho: number; note: string };
  verdict_threshold: number;
  top_gems: RankedStation[];
  top_bubbles: RankedStation[];
  industries: string[];
}
