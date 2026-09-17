export interface Place {
  id: string;

  name: string;
  area: string;

  price: number;

  image?: string | null;
  description?: string | null;

  tags?: string[];

  services?: Array<{
    name: string;
    price?: number;
    description?: string;
  }>;

  packages?: Array<{
    name: string;
    price: number;
    description?: string;
  }>;

  extras?: Array<{
    name: string;
    price?: number;
    description?: string;
  }>;

  active: boolean;

  sort_order: number;

  created_at?: string;
  updated_at?: string;

  /*
   * حقول مساعدة للـChatbot
   * لا تحتاج تكون موجودة في Supabase
   */
  family?: boolean;
  couple?: boolean;
  waterPark?: boolean;
  spa?: boolean;
  luxury?: boolean;
  pool?: boolean;
  food?: string;
  note?: string;
  address?: string;
}