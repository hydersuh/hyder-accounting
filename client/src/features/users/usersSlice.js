import {
  createSlice,
  createAsyncThunk,
  buildCreateSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "/api/users";

// Initial state
const initialState = {
  items: [],
  createUser: null,
  isLoading: false,
  isError: false,
  message: "",
};

// Fetch users thunk
export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to fetch users";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Create user BY id thunk
export const fetchUserById = createAsyncThunk(
  "users/fetchById",
  async (id, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to fetch user";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Create user thunk
export const createUser = createAsyncThunk(
  "users/create",
  async (userData, thunkAPI) => {
    try {
      const response = await axios.post(API_URL, userData);
      toast.success("User created successfully!");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to create user";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Update user thunk
export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, userData }, thunkAPI) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, userData);
      toast.success("User updated successfully!");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to update user";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

// Delete user thunk
export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, thunkAPI) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      toast.success("User deleted successfully!");
      return id;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to delete user";
      toast.error(message);
      return thunkAPI.rejectWithValue(message);
    }
  },
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    resetCreateUser(state) {
      state.isLoading = false;
      state.isError = false;
      state.message = "";
    },
  },

  clearCreateUser(state) {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.createUser = action.payload;
      })

      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (user) => user.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((user) => user.id !== action.payload);
      });
  },
});

export const { resetCreateUser, clearCreateUser } = usersSlice.actions;
export default usersSlice.reducer;
