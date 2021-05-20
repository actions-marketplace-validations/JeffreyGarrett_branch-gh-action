const core = require('@actions/core');
const github = require('@actions/github');
const { GitHub } = require('@actions/github/lib/utils');
const fs = require('fs');

//setup branching structure
const branchRulesFile = fs.readFileSync('branchStructure.json');
const branchRules = JSON.parse(branchRulesFile);
const branchStructure = core.getInput('branch_structure') || branchRules;

//setup rest client
const token = (core.getInput('github_token') || process.env.GITHUB_TOKEN);

//environment variables that could be used vs API call.
const base = (core.getInput('github_base_ref') || process.env.GITHUB_BASE_REF);
const head = (core.getInput('github_head_ref') || process.env.GITHUB_HEAD_REF);

const octokit = github.getOctokit(token);
const context = github.context

async function run() {

    try {
        console.log("Getting PR information");
        //sending API request to get the full PR object
        const prPayload = github.context.payload.pull_request.number;
        const request = await octokit.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prPayload
        })
        const pr = request.data;
        
        console.log("The base branch is: " + pr.base.ref);
        console.log("The head branch is: " + pr.head.ref);
        console.log("Branch rules are:  " + JSON.stringify(branchStructure));
        //main logic to test branching structure. 
        //console.log(JSON.stringify(branchStructure));
        branchStructure.branch_rules.forEach(branch => {
            if (branch.branch === pr.base.ref) {
                branch.accepted_incoming_branches.forEach(rule => {
                    if (rule === pr.head.ref) {
                        console.log("rule found for " + rule)
                        console.log("This is ok!");
                        core.ExitCode.Success;

                    }
                });

            } else {
                console.log(prPayload.number);
                core.setFailed("No matching branch rule for merging " + pr.head.ref + " into " + pr.base.ref);
                core.ExitCode.Failure;
            }
        });

    } catch (error) {

        core.setFailed(error.message);
    }
}


//run application
run().catch((error) => {
    core.setFailed(error.message)
})
