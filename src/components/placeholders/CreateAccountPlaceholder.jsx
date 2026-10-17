// PLACEHOLDER: temporary "create an account" page (route: /create-account).
// Replace this file with the real create-account page; the logged-out home only links to the route.
import { Link } from '../../utils/router';
import './PlaceholderPage.css';

export default function CreateAccountPlaceholder() {
  return (
    <main className="placeholder-page">
      <Link to="/" className="placeholder-page__back">back</Link>
      <h1 className="placeholder-page__title">create an account</h1>
    </main>
  );
}
