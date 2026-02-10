import { API_BASE_URL } from '@/core/config';

export async function showTipJar(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/donate/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error('Tip jar error:', error);
    alert('Failed to open tip jar. Please try again later.');
  }
}
