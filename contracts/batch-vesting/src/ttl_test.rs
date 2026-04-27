#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, Vec};
use crate::token::{self, Client as TokenClient, StellarAssetClient as TokenAdminClient};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, TokenAdminClient<'a>) {
    let contract_address = env.register_stellar_asset_contract(admin.clone());
    (
        TokenClient::new(env, &contract_address),
        TokenAdminClient::new(env, &contract_address),
    )
}

#[test]
fn test_ttl_bumping_logic() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BatchVestingContract);
    let client = BatchVestingContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let (token, token_admin_client) = create_token_contract(&env, &token_admin);
    token_admin_client.mint(&sender, &1000);

    // Initial deposit
    client.deposit(
        &sender,
        &Vec::from_array(&env, [token.address.clone()]),
        &Vec::from_array(&env, [recipient.clone()]),
        &Vec::from_array(&env, [1000]),
        &1000,
        &2000,
        &0,
        &Vec::from_array(&env, [soroban_sdk::String::from_str(&env, "Test Memo")]),
    );

    // Verify it doesn't crash
    client.bump_instance_ttl();
    client.bump_vesting_ttl(&recipient, &0);
    client.maintenance(&recipient);
}
