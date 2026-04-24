import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    journal: journalReducer,
    mainAccounts: mainAccountsReducer,
    subAccounts: subAccountsReducer,
  },
});
