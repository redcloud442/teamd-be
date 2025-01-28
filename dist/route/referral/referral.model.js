import { supabaseClient } from "../../utils/supabase.js";
export const referralDirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, } = params;
    const inputData = {
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        columnAccessor: columnAccessor || "",
        isAscendingSort: isAscendingSort ? "true" : "false",
        teamMemberId: teamMemberProfile?.alliance_member_id || "",
        teamId: teamMemberProfile?.alliance_member_alliance_id || "",
    };
    const { data, error } = await supabaseClient.rpc("get_ally_bounty", {
        input_data: inputData,
    });
    if (error)
        throw error;
    return data;
};
export const referralIndirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, } = params;
    const inputData = {
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        columnAccessor: columnAccessor || "",
        isAscendingSort: isAscendingSort ? "true" : "false",
        teamMemberId: teamMemberProfile?.alliance_member_id || "",
        teamId: teamMemberProfile?.alliance_member_alliance_id || "",
    };
    const { data, error } = await supabaseClient.rpc("get_legion_bounty", {
        input_data: inputData,
    });
    if (error)
        throw error;
    return data;
};
