import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUser,
} from "./usersSlice";
import {
  Table,
  Button,
  Modal,
  TextInput,
  Label,
  Select,
  Badge,
  Spinner,
  Alert,
} from "flowbite-react";
import { HiPlus, HiPencil, HiTrash, HiRefresh } from "react-icons/hi";

const Users = () => {
  const dispatch = useDispatch();
  const { items, isLoading, isError, message } = useSelector(
    (state) => state.users,
  );
  const { user: currentUser } = useSelector((state) => state.auth);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "user",
    is_active: true,
  });

  useEffect(() => {
    dispatch(fetchUsers());
    return () => {
      dispatch(resetUser());
    };
  }, [dispatch]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        password: "",
        role: user.role,
        is_active: user.is_active === 1,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
        full_name: "",
        password: "",
        role: "user",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((formData) => ({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      dispatch(updateUser({ id: editingUser.id, ...formData }));
    } else {
      dispatch(createUser(formData));
    }
    handleCloseModal();
    dispatch(fetchUsers());
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(`Are you sure you want to delete this user "${name}"?`)
    ) {
      await dispatch(deleteUser(id));
      dispatch(fetchUsers());
    }
  };

  const getRoleLabel = (role) => {
    const color = {
      admin: "failure",
      manager: "warning",
      accountant: "info",
      user: "success",
    };
    return colors[role] || "gray";
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users and their roles
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <div className="flex gap-3">
            <Button
              color="gray"
              onClick={() => dispatch(fetchUsers())}
              disabled={isLoading}
            >
              <HiRefresh className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              gradientDuoTone="purpleToBlue"
              onClick={() => handleOpenModal()}
            >
              <HiPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {isError && (
        <Alert
          color="failure"
          className="mb-4"
          onDismiss={() => dispatch(resetUsers())}
        >
          {message}
        </Alert>
      )}

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Username</Table.HeadCell>
              <Table.HeadCell>Full Name</Table.HeadCell>
              <Table.HeadCell>Email</Table.HeadCell>
              <Table.HeadCell>Role</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell>Last Login</Table.HeadCell>
              <Table.HeadCell>Actions</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y">
              {items.map((user) => (
                <Table.Row key={user.id} className="hover:bg-gray-50">
                  <Table.Cell className="font-mono font-medium">
                    {user.username}
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    {user.full_name}
                  </Table.Cell>
                  <Table.Cell>{user.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={user.is_active ? "success" : "failure"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>

                  <Table.Cell className="text-xs">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString()
                      : "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        color="light"
                        onClick={() => handleOpenModal(user)}
                      >
                        <HiPencil className="h-3 w-3" />
                      </Button>
                      {currentUser?.role === "admin" &&
                        currentUser?.id !== user.id && (
                          <Button
                            size="xs"
                            color="failure"
                            onClick={() =>
                              handleDelete(user.id, user.full_name)
                            }
                          >
                            <HiTrash className="h-3 w-3" />
                          </Button>
                        )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        {items.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found.</p>
            <Button
              gradientDuoTone="purpleToBlue"
              onClick={() => handleOpenModal()}
              className="mt-4"
            >
              Create your first user
            </Button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal show={isModalOpen} onClose={handleCloseModal} size="lg">
        <Modal.Header>
          {editingUser ? "Edit User" : "Add New User"}
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username" value="Username *" />
                <TextInput
                  id="username"
                  name="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="full_name" value="Full Name *" />
                <TextInput
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" value="Email *" />
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role" value="Role" />
                <Select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  <option value="accountant">Accountant</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="password"
                  value={editingUser ? "New Password (optional)" : "Password *"}
                />
                <TextInput
                  id="password"
                  name="password"
                  type="password"
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current"
                      : "Enter password"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  required={!editingUser}
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <Label htmlFor="is_active" className="ml-2">
                Active
              </Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button color="gray" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" gradientDuoTone="purpleToBlue">
                {editingUser ? "Update" : "Create"} User
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Users;
