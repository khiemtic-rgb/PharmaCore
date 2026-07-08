import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthGuard, GuestGuard } from '@/shared/auth/AuthGuard';

import { LoginPage } from '@/modules/auth/LoginPage';

import { HubPage } from '@/modules/hub/HubPage';

import { PosPage } from '@/modules/pos/PosPage';

import { CheckoutPage } from '@/modules/pos/CheckoutPage';

import { ReceiptPage } from '@/modules/pos/ReceiptPage';

import { CustomersPage } from '@/modules/customers/CustomersPage';

import { ChatListPage } from '@/modules/chat/ChatListPage';

import { ChatThreadPage } from '@/modules/chat/ChatThreadPage';

import { TodayPage } from '@/modules/today/TodayPage';
import { ReturnsPage } from '@/modules/returns/ReturnsPage';
import { StockLookupPage } from '@/modules/stock/StockLookupPage';
import { OrdersPage } from '@/modules/orders/OrdersPage';
import { CollectPaymentPage } from '@/modules/collect/CollectPaymentPage';
import { CollectPaymentReceiptPage } from '@/modules/collect/CollectPaymentReceiptPage';
import { ReservationsPage } from '@/modules/reservations/ReservationsPage';
import { DraftsPage } from '@/modules/drafts/DraftsPage';
import { TransfersPage } from '@/modules/transfers/TransfersPage';
import { StocktakePage } from '@/modules/stocktake/StocktakePage';
import { StocktakeCountPage } from '@/modules/stocktake/StocktakeCountPage';
import { GoodsReceiptListPage } from '@/modules/goods-receipt/GoodsReceiptListPage';
import { GoodsReceiptCreatePage } from '@/modules/goods-receipt/GoodsReceiptCreatePage';
import { GoodsReceiptDetailPage } from '@/modules/goods-receipt/GoodsReceiptDetailPage';
import { CustomerDraftOrdersPage } from '@/modules/customer-drafts/CustomerDraftOrdersPage';



export function AppRouter() {

  return (

    <BrowserRouter>

      <Routes>

        <Route element={<GuestGuard />}>

          <Route path="/login" element={<LoginPage />} />

        </Route>

        <Route element={<AuthGuard />}>

          <Route path="/" element={<HubPage />} />

          <Route path="/pos" element={<PosPage />} />

          <Route path="/checkout" element={<CheckoutPage />} />

          <Route path="/receipt" element={<ReceiptPage />} />

          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/chat" element={<ChatListPage />} />

          <Route path="/chat/:customerId" element={<ChatThreadPage />} />

          <Route path="/today" element={<TodayPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/stock" element={<StockLookupPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/stocktake" element={<StocktakePage />} />
          <Route path="/stocktake/:id" element={<StocktakeCountPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/collect" element={<CollectPaymentPage />} />
          <Route path="/collect/receipt" element={<CollectPaymentReceiptPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/customer-drafts" element={<CustomerDraftOrdersPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/goods-receipt" element={<GoodsReceiptListPage />} />
          <Route path="/goods-receipt/new" element={<GoodsReceiptCreatePage />} />
          <Route path="/goods-receipt/:id" element={<GoodsReceiptDetailPage />} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </BrowserRouter>

  );

}

