/**
 * Erori pe câmp: cheia = numele câmpului, valoarea = lista de mesaje.
 *
 * @example
 * {
 *   email: ["Adresa de email nu este validă"],
 *   password: ["Parola trebuie să aibă minim 8 caractere", "Parola trebuie să conțină o cifră"]
 * }
 */
export type ErrorDetails = Record<string, string[]> | null;

/**
 * Răspuns de eroare — envelope uniform pentru toate excepțiile.
 */
export type ErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  details: ErrorDetails;
  meta: {
    path: string;
    timestamp: string;
  };
};

/**
 * Răspuns de succes — envelope uniform (include metadata pentru client).
 *
 * @example
 * {
 *   success: true,
 *   statusCode: 200,
 *   meta: { path: "/auth/login", timestamp: "2026-07-29T07:00:00.000Z" },
 *   data: { user: { id: "...", email: "..." } }
 * }
 */
export type SuccessResponse<T> = {
  success: true;
  statusCode: number;
  meta: {
    path: string;
    timestamp: string;
  };
  data: T;
};

export type ApiResponse<T> = ErrorResponse | SuccessResponse<T>;
