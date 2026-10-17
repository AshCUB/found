// PLACEHOLDER: temporary "sign in" page (route: /sign-in).
// Replace this file with the real sign-in page; the logged-out home only links to the route.
import { Link } from '../../utils/router';
import './PlaceholderPage.css';

export default function SignInPlaceholder() {
  return (
    <main className="placeholder-page">
      <Link to="/" className="placeholder-page__back">back</Link>
      <h1 className="placeholder-page__title">sign in</h1>
    </main>
  );
}
