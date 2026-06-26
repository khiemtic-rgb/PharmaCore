import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Popconfirm, Space, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { deleteUser, fetchUser, fetchUsers } from '@/shared/api/identity-admin.api';
import type { UserDetail, UserListItem } from '@/shared/api/identity-admin.types';
import { USER_STATUS_LABELS } from '@/shared/api/identity-admin.types';
import { apiErrorMessage } from '@/shared/api/api-error';
import { useAuthStore } from '@/shared/auth/auth.store';
import { useHasPermission } from '@/shared/auth/usePermission';
import { UserFormDrawer } from '@/modules/system/UserFormDrawer';

export function UserListPage() {
  const canWrite = useHasPermission('system.write');
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<UserDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUsers({ search: search || undefined, page, pageSize });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được danh sách tài khoản'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = async (row: UserListItem) => {
    try {
      setEditing(await fetchUser(row.id));
      setDrawerOpen(true);
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không tải được tài khoản'));
    }
  };

  const handleDelete = async (row: UserListItem) => {
    try {
      await deleteUser(row.id);
      message.success(`Đã xóa tài khoản ${row.username}`);
      await load();
    } catch (error) {
      message.error(apiErrorMessage(error, 'Không xóa được tài khoản'));
    }
  };

  const columns: ColumnsType<UserListItem> = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'employeeName',
      width: 220,
      ellipsis: true,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'employeePhone',
      width: 130,
      render: (v?: string) => v ?? '—',
    },
    {
      title: 'Vai trò',
      dataIndex: 'roleCodes',
      width: 110,
      render: (codes: string[]) =>
        codes.length ? codes.map((c) => <Tag key={c}>{c}</Tag>) : '—',
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      width: 148,
      render: (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 108,
      align: 'center',
      render: (v: number) => (
        <Tag color={v === 1 ? 'green' : 'default'}>{USER_STATUS_LABELS[v] ?? v}</Tag>
      ),
    },
    {
      title: 'Tác vụ',
      key: 'actions',
      width: 88,
      fixed: 'right',
      align: 'center',
      render: (_, row) =>
        canWrite ? (
          <Space size={4}>
            <Tooltip title="Sửa">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label="Sửa"
                onClick={() => void openEdit(row)}
              />
            </Tooltip>
            <Popconfirm
              title={`Xóa «${row.username}»?`}
              description="Tài khoản sẽ bị vô hiệu hóa."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              disabled={row.id === currentUserId}
              onConfirm={() => void handleDelete(row)}
            >
              <Tooltip
                title={
                  row.id === currentUserId
                    ? 'Không thể xóa tài khoản đang đăng nhập'
                    : 'Xóa'
                }
              >
                <span>
                  <Button
                    type="text"
                    size="small"
                    danger
                    disabled={row.id === currentUserId}
                    icon={<DeleteOutlined />}
                    aria-label="Xóa"
                    style={row.id === currentUserId ? { opacity: 0.35 } : undefined}
                  />
                </span>
              </Tooltip>
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      <Card
        title="Tài khoản nhân viên"
        extra={
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm username, email, tên, SĐT..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                setSearch(searchInput.trim());
              }}
              style={{ width: 260 }}
            />
            <Button
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim());
              }}
            >
              Tìm
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              Tải lại
            </Button>
            {canWrite ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Thêm tài khoản
              </Button>
            ) : null}
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 920 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </Card>

      <UserFormDrawer
        open={drawerOpen}
        editing={editing}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />
    </>
  );
}
