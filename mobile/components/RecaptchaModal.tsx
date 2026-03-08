import { Modal, View, ActivityIndicator, StyleSheet } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

/**
 * Builds the HTML page loaded inside the hidden WebView.
 *
 * Uses the Firebase compat SDK (plain <script> tags, no ES modules) for
 * maximum Android WebView compatibility. Follows the Firebase web docs
 * approach (#set-up-the-recaptcha-verifier):
 *   1. Create an invisible RecaptchaVerifier pointing at a DOM container.
 *   2. Call signInWithPhoneNumber(auth, phone, verifier).
 *   3. Post the verificationId back to React Native via postMessage.
 *
 * The caller then creates a PhoneAuthCredential from (verificationId + OTP)
 * and signs in with signInWithCredential() in the main JS context.
 */
function buildHtml(config: Record<string, unknown>, phone: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
  <div id="recaptcha-container"></div>

  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script>
    (function () {
      var post = function (data) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      };

      try {
        firebase.initializeApp(${JSON.stringify(config)});

        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'invisible',
          callback: function () {},
          'error-callback': function (err) { post({ ok: false, msg: String(err) }); },
        });

        firebase.auth().signInWithPhoneNumber(${JSON.stringify(phone)}, verifier)
          .then(function (result) {
            post({ ok: true, verificationId: result.verificationId });
          })
          .catch(function (e) {
            post({ ok: false, msg: e.message || String(e) });
          });
      } catch (e) {
        post({ ok: false, msg: e.message || String(e) });
      }
    })();
  </script>
</body>
</html>`;
}

interface Props {
  visible: boolean;
  phoneNumber: string;
  firebaseConfig: Record<string, unknown>;
  onVerificationId: (id: string) => void;
  onError: (msg: string) => void;
}

/**
 * A transparent modal with a hidden 1×1 WebView that handles the Firebase
 * reCAPTCHA flow and SMS dispatch, then reports back the verificationId.
 */
export function RecaptchaModal({
  visible,
  phoneNumber,
  firebaseConfig,
  onVerificationId,
  onError,
}: Props) {
  if (!visible) return null;

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.ok) onVerificationId(data.verificationId);
      else onError(data.msg ?? 'Failed to send OTP');
    } catch {
      onError('Unexpected error from reCAPTCHA');
    }
  };

  return (
    <Modal visible transparent animationType="none">
      <View style={s.overlay}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>

      {/* The WebView is tiny and invisible — it only needs to exist so the
          Firebase web SDK can find a DOM and render the reCAPTCHA. */}
      <WebView
        style={s.webview}
        source={{
          html: buildHtml(firebaseConfig, phoneNumber),
          // Pretend the page is served from localhost so Firebase's
          // authorized-domain check passes (add "localhost" in Console).
          baseUrl: 'https://localhost',
        }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  webview: {
    position: 'absolute',
    width: 1,
    height: 1,
    bottom: 0,
    left: 0,
    opacity: 0,
  },
});
