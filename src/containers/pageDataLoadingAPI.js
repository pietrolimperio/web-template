/**
 * Export loadData calls from ducks modules of different containers
 */
import { loadData as AIListingCreationPageLoader } from './AIListingCreationPage/AIListingCreationPage.duck';
import { loadData as AuthenticationPageLoader } from './AuthenticationPage/AuthenticationPage.duck';
import { loadData as LandingPageLoader } from './LandingPage/LandingPage.duck';
import { loadData as NewLandingPageLoader } from './NewLandingPage/NewLandingPage.duck';
import { setInitialValues as CheckoutPageInitialValues } from './CheckoutPage/CheckoutPage.duck';
import { loadData as CMSPageLoader } from './CMSPage/CMSPage.duck';
import { loadData as ContactDetailsPageLoader } from './ContactDetailsPage/ContactDetailsPage.duck';
import { loadData as EditListingPageLoader } from './EditListingPage/EditListingPage.duck';
import { loadData as EmailVerificationPageLoader } from './EmailVerificationPage/EmailVerificationPage.duck';
import { loadData as InboxPageLoader } from './InboxPage/InboxPage.duck';
import { loadData as ListingPageLoader } from './ListingPage/ListingPage.duck';
import { loadData as ProductPageLoader } from './ProductPage/ProductPage.duck';
import { loadData as MakeOfferPageLoader } from './MakeOfferPage/MakeOfferPage.duck';
import { loadData as ManageListingsPageLoader } from './ManageListingsPage/ManageListingsPage.duck';
import { loadData as PaymentMethodsPageLoader } from './PaymentMethodsPage/PaymentMethodsPage.duck';
import { loadData as PrivacyPolicyPageLoader } from './PrivacyPolicyPage/PrivacyPolicyPage.duck';
import { loadData as ProfilePageLoader } from './ProfilePage/ProfilePage.duck';
import { loadData as SearchPageLoader } from './SearchPage/SearchPage.duck';
import { loadData as StripePayoutPageLoader } from './StripePayoutPage/StripePayoutPage.duck';
import { loadData as TermsOfServicePageLoader } from './TermsOfServicePage/TermsOfServicePage.duck';
import {
  loadData as TransactionPageLoader,
  setInitialValues as TransactionPageInitialValues,
} from './TransactionPage/TransactionPage.duck';

const getPageDataLoadingAPI = () => {
  return {
    AIListingCreationPage: {
      loadData: AIListingCreationPageLoader,
    },
    AuthenticationPage: {
      loadData: AuthenticationPageLoader,
    },
    LandingPage: {
      loadData: LandingPageLoader,
    },
    NewLandingPage: {
      loadData: NewLandingPageLoader,
    },
    CheckoutPage: {
      setInitialValues: CheckoutPageInitialValues,
    },
    CMSPage: {
      loadData: CMSPageLoader,
    },
    ContactDetailsPage: {
      loadData: ContactDetailsPageLoader,
    },
    EditListingPage: {
      loadData: EditListingPageLoader,
    },
    EmailVerificationPage: {
      loadData: EmailVerificationPageLoader,
    },
    InboxPage: {
      loadData: InboxPageLoader,
    },
    ListingPage: {
      loadData: ListingPageLoader,
    },
    ProductPage: {
      loadData: ProductPageLoader,
    },
    MakeOfferPage: {
      loadData: MakeOfferPageLoader,
    },
    ManageListingsPage: {
      loadData: ManageListingsPageLoader,
    },
    PaymentMethodsPage: {
      loadData: PaymentMethodsPageLoader,
    },
    PrivacyPolicyPage: {
      loadData: PrivacyPolicyPageLoader,
    },
    ProfilePage: {
      loadData: ProfilePageLoader,
    },
    SearchPage: {
      loadData: SearchPageLoader,
    },
    StripePayoutPage: {
      loadData: StripePayoutPageLoader,
    },
    TermsOfServicePage: {
      loadData: TermsOfServicePageLoader,
    },
    TransactionPage: {
      loadData: TransactionPageLoader,
      setInitialValues: TransactionPageInitialValues,
    },
  };
};

export default getPageDataLoadingAPI;
