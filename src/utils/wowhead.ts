interface WowheadXHR extends XMLHttpRequest {
  _whUrl?: string;
}

const WOWHEAD_QUALITY_MAP: Record<string, string> = {
  'q0': 'poor',
  'q1': 'common',
  'q2': 'uncommon',
  'q3': 'rare',
  'q4': 'epic',
  'q5': 'legendary',
  'q6': 'artifact',
  'q7': 'heirloom'
};

function extractQualityFromTooltip(tooltipHtml: string): string | null {
  if (!tooltipHtml) return null;
  const match = tooltipHtml.match(/<b class="(q[0-7])"/);
  if (match && WOWHEAD_QUALITY_MAP[match[1]]) {
    return WOWHEAD_QUALITY_MAP[match[1]];
  }
  return null;
}

export function setupWowheadInterception(
  onTooltipReceived: (text: string, itemId: string | null) => void
): void {
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(
    this: WowheadXHR,
    method: string,
    url: string | URL,
    ...args: any[]
  ) {
    this._whUrl = url.toString();
    return origOpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.send = function(this: WowheadXHR, body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this;
    const url = xhr._whUrl || '';

    if (url.includes('wowhead.com')) {
      console.log('[XHR]', url);
      xhr.addEventListener('load', function() {
        try {
          const text = xhr.responseText;
          console.log('[XHR RESPONSE]', url, text.substring(0, 200));

          const idMatch = url.match(/item[=\/](\d+)/);
          onTooltipReceived(text, idMatch ? idMatch[1] : null);
        } catch (e) {
          console.error('[XHR] Error processing Wowhead response:', e);
        }
      });
    }

    return origSend.apply(this, [body] as any);
  };
}
