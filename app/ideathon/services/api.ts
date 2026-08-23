interface FormValidResponse {
  is_valid: boolean;
  close_time?: string;
}

const API_URL = process.env.NEXT_PUBLIC_REDIRECT_API_URL!;

export async function checkFormValidity(
  formId: string,
): Promise<{ is_valid: boolean; close_time?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/forms/${formId}/validity`, {
      next: {
        revalidate: 60,
      },
    });
    if (!res.ok) {
      return {
        is_valid: true,
        close_time: undefined,
      };
    }
    const { is_valid, close_time }: FormValidResponse = await res.json();
    return { is_valid, close_time };
  } catch (err) {
    console.error(err);
    return { is_valid: true, close_time: undefined };
  }
}
