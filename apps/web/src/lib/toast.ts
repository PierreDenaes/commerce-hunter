import { toast } from "sonner";
import { ApiError } from "./api-client";

export const showSuccess = (msg: string) => toast.success(msg);
export const showError = (msg: string) => toast.error(msg);
export const showApiError = (err: unknown) => {
  if (err instanceof ApiError) {
    toast.error(err.message);
  } else {
    toast.error("Une erreur inattendue est survenue");
  }
};
