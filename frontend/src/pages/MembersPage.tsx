import React, { useEffect, useState } from "react";
import { Card, Input, Button, Spinner } from "../components/common/Components";
import { memberService } from "../services/memberService";
import { Link } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

const defaultMemberForm = {
  full_name: "",
  email: "",
  phone: "",
  room_number: "",
  join_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const MembersPage: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState(defaultMemberForm);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memberService.getMembers(page, limit, search ? { q: search } : {});
      if (res.success) {
        setMembers(res.data || []);
        setTotal(res.pagination?.total || (res as any).count || 0);
      } else {
        setError(res.message || "Failed to load members");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [page, search]);

  const handleCreateMember = async () => {
    if (!memberForm.full_name.trim() || !memberForm.email.trim() || !memberForm.room_number.trim()) {
      setError("Name, email, and room number are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await memberService.createMember({
        full_name: memberForm.full_name.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
        room_number: memberForm.room_number.trim(),
        join_date: memberForm.join_date,
        notes: memberForm.notes.trim(),
      });

      if (res.success) {
        setShowCreateForm(false);
        setEditingMemberId(null);
        setMemberForm(defaultMemberForm);
        setPage(1);
        await loadMembers();
      } else {
        setError(res.message || "Failed to create member");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to create member");
    } finally {
      setSaving(false);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setMemberForm({
      full_name: member.full_name || member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      room_number: member.room_number || "",
      join_date: member.join_date || new Date().toISOString().split("T")[0],
      notes: member.notes || "",
    });
    setShowCreateForm(true);
  };

  const handleSaveMember = async () => {
    if (!editingMemberId) {
      await handleCreateMember();
      return;
    }

    if (!memberForm.full_name.trim() || !memberForm.email.trim() || !memberForm.room_number.trim()) {
      setError("Name, email, and room number are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await memberService.updateMember(editingMemberId, {
        full_name: memberForm.full_name.trim(),
        email: memberForm.email.trim(),
        phone: memberForm.phone.trim(),
        room_number: memberForm.room_number.trim(),
        join_date: memberForm.join_date,
        notes: memberForm.notes.trim(),
      });

      if (res.success) {
        setShowCreateForm(false);
        setEditingMemberId(null);
        setMemberForm(defaultMemberForm);
        await loadMembers();
      } else {
        setError(res.message || "Failed to update member");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this member?")) return;
    setLoading(true);
    try {
      const res = await memberService.deactivateMember(id);
      if (res.success) {
        await loadMembers();
      } else {
        setError(res.message || "Failed to deactivate member");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to deactivate member");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setLoading(true);
    try {
      const res = await memberService.activateMember(id);
      if (res.success) {
        await loadMembers();
      } else {
        setError(res.message || "Failed to restore member");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to restore member");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this member? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await memberService.deleteMember(id);
      if (res.success) {
        await loadMembers();
      } else {
        setError(res.message || "Failed to delete member");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to delete member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        {isAdmin && (
          <Button onClick={() => setShowCreateForm(true)}>Add Member</Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Input placeholder="Search by name, phone, or room number" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={() => { setPage(1); loadMembers(); }}>Search</Button>
          </div>
        </div>

        {showCreateForm && isAdmin && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Full name" value={memberForm.full_name} onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })} />
              <Input placeholder="Email" type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
              <Input placeholder="Phone" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
              <Input placeholder="Room number" value={memberForm.room_number} onChange={(e) => setMemberForm({ ...memberForm, room_number: e.target.value })} />
              <Input type="date" value={memberForm.join_date} onChange={(e) => setMemberForm({ ...memberForm, join_date: e.target.value })} />
              <Input placeholder="Notes" value={memberForm.notes} onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={editingMemberId ? handleSaveMember : handleCreateMember} disabled={saving}>{saving ? "Saving..." : editingMemberId ? "Update Member" : "Save Member"}</Button>
              <Button variant="secondary" onClick={() => {
                setShowCreateForm(false);
                setEditingMemberId(null);
                setMemberForm(defaultMemberForm);
              }}>Cancel</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Room</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-gray-500">No members found</td>
                  </tr>
                )}
                {members.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-3"><Link to={`/members/${m.id}`} className="text-blue-600 hover:underline">{m.full_name || m.name}</Link></td>
                    <td className="p-3">{m.email}</td>
                    <td className="p-3">{m.phone || "-"}</td>
                    <td className="p-3">{m.room_number || "-"}</td>
                    <td className="p-3">{m.is_active ? "Active" : "Inactive"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button variant="secondary" onClick={() => handleEditMember(m)}>Edit</Button>
                        )}
                        {m.is_active ? (
                          <Button variant="secondary" onClick={() => handleDeactivate(m.id)}>Deactivate</Button>
                        ) : (
                          <Button variant="primary" onClick={() => handleRestore(m.id)}>Restore</Button>
                        )}
                        {isAdmin && (
                          <Button variant="danger" onClick={() => handleDelete(m.id)}>Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Total: {total || 0}</div>
              <div className="space-x-2">
                <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MembersPage;
