import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "/api/auth";

// Initial state
const initialState = {
  user: JSON.parse(localStorage.getItem("user")) || null,
  token: localStorage.getItem("token") || null,
  isLoding: false,
  isError: false,
  isSuccess: false,
  message: "",
};

// Login thunk
export const login = createAsyncThunk(
  "auth/login",
  async ({ username, password }, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Login failed";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Register thunk
export const register = createAsyncThunk(
  "auth/register",
  async (userData, thunkAPI) => {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      toast.success("Registration successful! Please login.");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Registration failed";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Verify token thunk
export const verifyToken = createAsyncThunk(
  "auth/verify",
  async (_, thunkAPI) => {
    const token = localStorage.getItem("token");
    if (!token) {
      return thunkAPI.rejectWithValue("No token found");
    }
    try {
      const response = await axios.post(
        `${API_URL}/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return thunkAPI.rejectWithValue("Invalid token");
    }
  },
);

// Change password thunk
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ currentPassword, newPassword }, thunkAPI) => {
    const token = thunkAPI.getState().auth.token;
    try {
      const response = await axios.post(
        `${API_URL}/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Password changed successfully");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Password change failed";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Loout thunk
export const logout = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  const token = thunkAPI.getState().auth.token;
  try {
    await axios.post(
      `${API_URL}/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  } catch (error) {
    console.error("Logout error:", error);
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  toast.success("Logged out successfully");
  return {};
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoding = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = "";
    },
    clearError: (state) => {
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoding = false;
        state.isSuccess = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("token", action.payload.token);
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        toast.success(`Welcome back, ${action.payload.user.full_name}!`);
      })

      .addCase(login.rejected, (state, action) => {
        state.isLoding = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Register
      .addCase(register.pending, (state) => {
        state.isLoding = true;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoding = false;
        state.isSuccess = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoding = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Verify token
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.user = action.payload.user;
      })
      .addCase(verifyToken.rejected, (state) => {
        state.user = null;
        state.token = null;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isSuccess = false;
        state.isError = false;
      })

      // Change password
      .addCase(changePassword.pending, (state) => {
        state.isLoding = true;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoding = false;
        state.isSuccess = true;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoding = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset, clearError } = authSlice.actions;
export default authSlice.reducer;
